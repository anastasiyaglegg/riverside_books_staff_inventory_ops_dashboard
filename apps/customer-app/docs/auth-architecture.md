# Customer Auth Architecture

Firebase Authentication for the Riverside Books customer app. Two React contexts,
joined by email: **AuthContext** owns the credential/session (Firebase); **CustomerContext**
owns the loyalty/order record (backend). They never import each other — components that
need both consume both hooks.

## Provider tree & context wiring

```mermaid
graph TD
    subgraph Providers
        BR[BrowserRouter]
        AP[AuthProvider<br/>Firebase session]
        CP[CustomerProvider<br/>loyalty / orders]
        BR --> AP --> CP --> RT[AppRoutes]
    end

    FB[(Firebase Auth)] -. onAuthStateChanged .-> AP
    API[(Backend /api/v1/customers)] -. identify / refresh .-> CP

    AP -- useAuth() --> AuthPage
    AP -- useAuth() --> NavBar
    AP -- useAuth() --> ProtectedRoute
    AP -- useAuth() --> Banner[EmailVerificationBanner]
    AP -- useAuth() --> AccountPage

    CP -- useCustomer() --> AuthPage
    CP -- useCustomer() --> NavBar
    CP -- useCustomer() --> AccountPage

    ProtectedRoute -- gates --> AccountPage

    classDef ctx fill:#f7ecdf,stroke:#8a5a34,color:#3c240f;
    classDef ext fill:#e8eef7,stroke:#3a5a8a,color:#0f2440;
    class AP,CP ctx;
    class FB,API ext;
```

`onAuthStateChanged` is the single source of truth: nothing sets `user` by hand. Every
login/logout/signup flows through Firebase's listener, which updates AuthContext, which
re-renders every consumer — so the navbar and route guard stay in sync automatically.

## Signup flow

```mermaid
sequenceDiagram
    participant U as User
    participant AuthPage
    participant Auth as AuthContext
    participant FB as Firebase
    participant Cust as CustomerContext
    participant API as Backend

    U->>AuthPage: submit name + email + password
    AuthPage->>AuthPage: validate match + zxcvbn score >= 2
    AuthPage->>Auth: signUp(email, pw, keepSignedIn)
    Auth->>FB: setPersistence() then createUser()
    FB-->>Auth: user (emailVerified=false)
    Auth->>FB: sendEmailVerification()
    FB-->>Auth: user (fires onAuthStateChanged)
    AuthPage->>Cust: identify({ name, email })
    Cust->>API: POST /customers
    API-->>Cust: Customer (persisted to localStorage)
    AuthPage->>U: navigate /account (banner nudges verify)
```

## Login & logout

```mermaid
sequenceDiagram
    participant U as User
    participant AuthPage
    participant Auth as AuthContext
    participant FB as Firebase
    participant Cust as CustomerContext

    Note over U,Cust: Same-device login
    U->>AuthPage: submit email + password
    AuthPage->>Auth: signIn(email, pw, keepSignedIn)
    Auth->>FB: setPersistence() then signIn()
    FB-->>Auth: onAuthStateChanged -> user set
    Note over Cust: localStorage 'riverside_customer' already rehydrated → loyalty shows
    AuthPage->>U: navigate /account

    Note over U,Cust: Logout
    U->>Auth: signOut()  (Firebase session cleared)
    U->>Cust: signOut()  (customer + localStorage cleared)
    U->>AuthPage: navigate /login
```

## Route gating

```mermaid
flowchart LR
    R[/account request/] --> PR{ProtectedRoute<br/>useAuth()}
    PR -->|loading| S[Spinner]
    PR -->|no user| L[Navigate to /login]
    PR -->|user| A[AccountPage]
    A --> C{customer in<br/>localStorage?}
    C -->|yes| Acc[Loyalty + order history]
    C -->|no, new device| Rec[Reconnect loyalty card<br/>identify by email]
```

## Known limitation: cross-device loyalty

On a new device, Firebase login succeeds but there is no public endpoint to fetch a
Customer by email/uid (`GET /customers` is staff-only). So loyalty history can't
auto-restore — the **Reconnect** card re-links by email instead. True cross-device
restore needs a backend `firebaseUid` column + an authenticated `GET /customers/me`,
deferred for now.
