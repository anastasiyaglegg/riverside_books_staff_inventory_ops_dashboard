import { PrismaClient, type Book, type Customer } from "@prisma/client";
import { deriveStockStatus } from "../lib/inventory";

const prisma = new PrismaClient();

/**
 * Reseeds the catalog/customer/order/event/policy tables with a much larger,
 * realistic-feeling dataset (~200 books) so the app doesn't look like an empty
 * demo. Unlike the original version of this script, this one is DESTRUCTIVE:
 * it clears books/inventory/customers/orders/order_items/loyalty_transactions/
 * events/store_policies every run and rebuilds them from scratch.
 *
 * It deliberately never touches `staff_users` beyond upserting two bookseller
 * rows by name -- that table holds the real Supabase Auth-linked owner account
 * (owners@riversidebooks.local), and wiping it would break login.
 */

// Real, well-known titles across genres -- not generated placeholders -- so the
// catalog reads like an actual bookstore. ISBNs below are synthetic/sequential,
// not real industry-assigned numbers; only used here to exercise the unique
// constraint.
const BOOK_TITLES: [title: string, author: string, category: string][] = [
  // Fiction
  ["The Great Gatsby", "F. Scott Fitzgerald", "fiction"],
  ["To Kill a Mockingbird", "Harper Lee", "fiction"],
  ["1984", "George Orwell", "fiction"],
  ["Pride and Prejudice", "Jane Austen", "fiction"],
  ["The Catcher in the Rye", "J.D. Salinger", "fiction"],
  ["Brave New World", "Aldous Huxley", "fiction"],
  ["The Kite Runner", "Khaled Hosseini", "fiction"],
  ["Life of Pi", "Yann Martel", "fiction"],
  ["The Book Thief", "Markus Zusak", "fiction"],
  ["The Road", "Cormac McCarthy", "fiction"],
  ["Beloved", "Toni Morrison", "fiction"],
  ["Slaughterhouse-Five", "Kurt Vonnegut", "fiction"],
  ["One Hundred Years of Solitude", "Gabriel García Márquez", "fiction"],
  ["The Alchemist", "Paulo Coelho", "fiction"],
  ["The Bell Jar", "Sylvia Plath", "fiction"],
  ["Norwegian Wood", "Haruki Murakami", "fiction"],
  ["The Remains of the Day", "Kazuo Ishiguro", "fiction"],
  ["Never Let Me Go", "Kazuo Ishiguro", "fiction"],
  ["White Teeth", "Zadie Smith", "fiction"],
  ["Middlesex", "Jeffrey Eugenides", "fiction"],
  ["The Corrections", "Jonathan Franzen", "fiction"],
  ["Freedom", "Jonathan Franzen", "fiction"],
  ["A Little Life", "Hanya Yanagihara", "fiction"],
  ["The Goldfinch", "Donna Tartt", "fiction"],
  ["The Secret History", "Donna Tartt", "fiction"],
  ["Circe", "Madeline Miller", "fiction"],
  ["The Song of Achilles", "Madeline Miller", "fiction"],
  ["Piranesi", "Susanna Clarke", "fiction"],
  ["Klara and the Sun", "Kazuo Ishiguro", "fiction"],
  ["Cloud Cuckoo Land", "Anthony Doerr", "fiction"],
  ["All the Light We Cannot See", "Anthony Doerr", "fiction"],
  ["Where the Crawdads Sing", "Delia Owens", "fiction"],
  ["Lessons in Chemistry", "Bonnie Garmus", "fiction"],
  ["Demon Copperhead", "Barbara Kingsolver", "fiction"],
  ["Tomorrow, and Tomorrow, and Tomorrow", "Gabrielle Zevin", "fiction"],
  // Mystery / Thriller
  ["The Silent Patient", "Alex Michaelides", "mystery"],
  ["Gone Girl", "Gillian Flynn", "mystery"],
  ["The Girl with the Dragon Tattoo", "Stieg Larsson", "mystery"],
  ["In the Woods", "Tana French", "mystery"],
  ["Big Little Lies", "Liane Moriarty", "mystery"],
  ["The Thursday Murder Club", "Richard Osman", "mystery"],
  ["The Guest List", "Lucy Foley", "mystery"],
  ["The Woman in the Window", "A.J. Finn", "mystery"],
  ["Sharp Objects", "Gillian Flynn", "mystery"],
  ["And Then There Were None", "Agatha Christie", "mystery"],
  ["The Da Vinci Code", "Dan Brown", "mystery"],
  ["The Girl on the Train", "Paula Hawkins", "mystery"],
  ["Rebecca", "Daphne du Maurier", "mystery"],
  ["The Maltese Falcon", "Dashiell Hammett", "mystery"],
  ["The Talented Mr. Ripley", "Patricia Highsmith", "mystery"],
  ["Mystic River", "Dennis Lehane", "mystery"],
  ["The Cuckoo's Calling", "Robert Galbraith", "mystery"],
  ["The No. 1 Ladies' Detective Agency", "Alexander McCall Smith", "mystery"],
  ["Death on the Nile", "Agatha Christie", "mystery"],
  ["Murder on the Orient Express", "Agatha Christie", "mystery"],
  ["Mystery at Riverside", "J. Alden Cole", "mystery"],
  ["The Maid", "Nita Prose", "mystery"],
  // Sci-Fi / Fantasy
  ["Dune", "Frank Herbert", "sci-fi"],
  ["Foundation", "Isaac Asimov", "sci-fi"],
  ["Neuromancer", "William Gibson", "sci-fi"],
  ["Snow Crash", "Neal Stephenson", "sci-fi"],
  ["The Left Hand of Darkness", "Ursula K. Le Guin", "sci-fi"],
  ["Ender's Game", "Orson Scott Card", "sci-fi"],
  ["The Hobbit", "J.R.R. Tolkien", "fantasy"],
  ["The Fellowship of the Ring", "J.R.R. Tolkien", "fantasy"],
  ["The Name of the Wind", "Patrick Rothfuss", "fantasy"],
  ["Mistborn", "Brandon Sanderson", "fantasy"],
  ["The Way of Kings", "Brandon Sanderson", "fantasy"],
  ["A Game of Thrones", "George R.R. Martin", "fantasy"],
  ["The Hunger Games", "Suzanne Collins", "sci-fi"],
  ["Ready Player One", "Ernest Cline", "sci-fi"],
  ["Project Hail Mary", "Andy Weir", "sci-fi"],
  ["The Martian", "Andy Weir", "sci-fi"],
  ["Station Eleven", "Emily St. John Mandel", "sci-fi"],
  ["The Handmaid's Tale", "Margaret Atwood", "sci-fi"],
  ["Fahrenheit 451", "Ray Bradbury", "sci-fi"],
  ["Do Androids Dream of Electric Sheep?", "Philip K. Dick", "sci-fi"],
  ["The Three-Body Problem", "Liu Cixin", "sci-fi"],
  ["Children of Time", "Adrian Tchaikovsky", "sci-fi"],
  ["The Fifth Season", "N.K. Jemisin", "fantasy"],
  ["American Gods", "Neil Gaiman", "fantasy"],
  ["Good Omens", "Terry Pratchett and Neil Gaiman", "fantasy"],
  ["The Priory of the Orange Tree", "Samantha Shannon", "fantasy"],
  // Nonfiction
  ["Atomic Habits", "James Clear", "nonfiction"],
  ["Sapiens", "Yuval Noah Harari", "nonfiction"],
  ["Thinking, Fast and Slow", "Daniel Kahneman", "nonfiction"],
  ["The Power of Habit", "Charles Duhigg", "nonfiction"],
  ["Outliers", "Malcolm Gladwell", "nonfiction"],
  ["Quiet", "Susan Cain", "nonfiction"],
  ["Grit", "Angela Duckworth", "nonfiction"],
  ["Deep Work", "Cal Newport", "nonfiction"],
  ["The Body Keeps the Score", "Bessel van der Kolk", "nonfiction"],
  ["Braiding Sweetgrass", "Robin Wall Kimmerer", "nonfiction"],
  ["Just Mercy", "Bryan Stevenson", "nonfiction"],
  ["The Omnivore's Dilemma", "Michael Pollan", "nonfiction"],
  ["In Defense of Food", "Michael Pollan", "nonfiction"],
  ["Guns, Germs, and Steel", "Jared Diamond", "nonfiction"],
  ["A Brief History of Time", "Stephen Hawking", "nonfiction"],
  ["The Sixth Extinction", "Elizabeth Kolbert", "nonfiction"],
  ["Silent Spring", "Rachel Carson", "nonfiction"],
  ["Between the World and Me", "Ta-Nehisi Coates", "nonfiction"],
  ["Stiff", "Mary Roach", "nonfiction"],
  ["The Immortal Life of Henrietta Lacks", "Rebecca Skloot", "nonfiction"],
  // Memoir / Biography
  ["Educated", "Tara Westover", "memoir"],
  ["Wild", "Cheryl Strayed", "memoir"],
  ["Born a Crime", "Trevor Noah", "memoir"],
  ["Becoming", "Michelle Obama", "memoir"],
  ["Know My Name", "Chanel Miller", "memoir"],
  ["Untamed", "Glennon Doyle", "memoir"],
  ["When Breath Becomes Air", "Paul Kalanithi", "memoir"],
  ["The Glass Castle", "Jeannette Walls", "memoir"],
  ["Eat, Pray, Love", "Elizabeth Gilbert", "memoir"],
  ["Bossypants", "Tina Fey", "memoir"],
  ["Steve Jobs", "Walter Isaacson", "memoir"],
  ["Alexander Hamilton", "Ron Chernow", "memoir"],
  ["The Diary of a Young Girl", "Anne Frank", "memoir"],
  ["Night", "Elie Wiesel", "memoir"],
  ["A Promised Land", "Barack Obama", "memoir"],
  // Romance
  ["Beach Read", "Emily Henry", "romance"],
  ["The Hating Game", "Sally Thorne", "romance"],
  ["People We Meet on Vacation", "Emily Henry", "romance"],
  ["Red, White & Royal Blue", "Casey McQuiston", "romance"],
  ["It Ends with Us", "Colleen Hoover", "romance"],
  ["Book Lovers", "Emily Henry", "romance"],
  ["The Kiss Quotient", "Helen Hoang", "romance"],
  ["Outlander", "Diana Gabaldon", "romance"],
  ["The Notebook", "Nicholas Sparks", "romance"],
  ["Me Before You", "Jojo Moyes", "romance"],
  ["Normal People", "Sally Rooney", "romance"],
  ["One Day", "David Nicholls", "romance"],
  ["Eleanor Oliphant Is Completely Fine", "Gail Honeyman", "romance"],
  ["The Rosie Project", "Graeme Simsion", "romance"],
  // Young Adult
  ["The Fault in Our Stars", "John Green", "young-adult"],
  ["Divergent", "Veronica Roth", "young-adult"],
  ["The Perks of Being a Wallflower", "Stephen Chbosky", "young-adult"],
  ["Speak", "Laurie Halse Anderson", "young-adult"],
  ["Eleanor & Park", "Rainbow Rowell", "young-adult"],
  ["Six of Crows", "Leigh Bardugo", "young-adult"],
  ["The Hate U Give", "Angie Thomas", "young-adult"],
  ["Wonder", "R.J. Palacio", "young-adult"],
  [
    "Aristotle and Dante Discover the Secrets of the Universe",
    "Benjamin Alire Sáenz",
    "young-adult",
  ],
  ["Turtles All the Way Down", "John Green", "young-adult"],
  ["We Were Liars", "E. Lockhart", "young-adult"],
  ["Legend", "Marie Lu", "young-adult"],
  ["Red Queen", "Victoria Aveyard", "young-adult"],
  ["Shatter Me", "Tahereh Mafi", "young-adult"],
  // Children's
  ["The Very Hungry Caterpillar", "Eric Carle", "childrens"],
  ["Where the Wild Things Are", "Maurice Sendak", "childrens"],
  ["Charlotte's Web", "E.B. White", "childrens"],
  ["Goodnight Moon", "Margaret Wise Brown", "childrens"],
  ["The Giving Tree", "Shel Silverstein", "childrens"],
  ["Matilda", "Roald Dahl", "childrens"],
  ["Charlie and the Chocolate Factory", "Roald Dahl", "childrens"],
  ["James and the Giant Peach", "Roald Dahl", "childrens"],
  ["The Cat in the Hat", "Dr. Seuss", "childrens"],
  ["Green Eggs and Ham", "Dr. Seuss", "childrens"],
  ["Corduroy", "Don Freeman", "childrens"],
  ["Make Way for Ducklings", "Robert McCloskey", "childrens"],
  ["The Snowy Day", "Ezra Jack Keats", "childrens"],
  ["Frog and Toad Are Friends", "Arnold Lobel", "childrens"],
  ["Because of Winn-Dixie", "Kate DiCamillo", "childrens"],
  ["The Tale of Peter Rabbit", "Beatrix Potter", "childrens"],
  // Classic Literature
  ["Moby-Dick", "Herman Melville", "classics"],
  ["War and Peace", "Leo Tolstoy", "classics"],
  ["Anna Karenina", "Leo Tolstoy", "classics"],
  ["Crime and Punishment", "Fyodor Dostoevsky", "classics"],
  ["Jane Eyre", "Charlotte Brontë", "classics"],
  ["Wuthering Heights", "Emily Brontë", "classics"],
  ["Great Expectations", "Charles Dickens", "classics"],
  ["A Tale of Two Cities", "Charles Dickens", "classics"],
  ["Don Quixote", "Miguel de Cervantes", "classics"],
  ["The Odyssey", "Homer", "classics"],
  ["The Iliad", "Homer", "classics"],
  ["Frankenstein", "Mary Shelley", "classics"],
  ["Dracula", "Bram Stoker", "classics"],
  ["The Picture of Dorian Gray", "Oscar Wilde", "classics"],
  ["Heart of Darkness", "Joseph Conrad", "classics"],
  ["The Scarlet Letter", "Nathaniel Hawthorne", "classics"],
  ["The Grapes of Wrath", "John Steinbeck", "classics"],
  ["East of Eden", "John Steinbeck", "classics"],
  ["Of Mice and Men", "John Steinbeck", "classics"],
  ["The Sun Also Rises", "Ernest Hemingway", "classics"],
  ["A Farewell to Arms", "Ernest Hemingway", "classics"],
  // Business / Self-Help
  ["Good to Great", "Jim Collins", "business"],
  ["The Lean Startup", "Eric Ries", "business"],
  ["Zero to One", "Peter Thiel", "business"],
  ["The 7 Habits of Highly Effective People", "Stephen Covey", "business"],
  ["How to Win Friends and Influence People", "Dale Carnegie", "business"],
  ["The 4-Hour Workweek", "Timothy Ferriss", "business"],
  ["Start with Why", "Simon Sinek", "business"],
  ["The Innovator's Dilemma", "Clayton Christensen", "business"],
  ["Rich Dad Poor Dad", "Robert Kiyosaki", "business"],
  ["The Psychology of Money", "Morgan Housel", "business"],
  ["Man's Search for Meaning", "Viktor Frankl", "business"],
  ["Can't Hurt Me", "David Goggins", "business"],
  ["Essentialism", "Greg McKeown", "business"],
  // Poetry
  ["Milk and Honey", "Rupi Kaur", "poetry"],
  ["The Sun and Her Flowers", "Rupi Kaur", "poetry"],
  ["Leaves of Grass", "Walt Whitman", "poetry"],
  ["Ariel", "Sylvia Plath", "poetry"],
  ["Devotions", "Mary Oliver", "poetry"],
  ["Citizen", "Claudia Rankine", "poetry"],
  ["What the Living Do", "Marie Howe", "poetry"],
  // Cooking
  ["Salt, Fat, Acid, Heat", "Samin Nosrat", "cooking"],
  ["The Joy of Cooking", "Irma S. Rombauer", "cooking"],
  ["Mastering the Art of French Cooking", "Julia Child", "cooking"],
  ["Plenty", "Yotam Ottolenghi", "cooking"],
  ["Six Seasons", "Joshua McFadden", "cooking"],
  ["Cravings", "Chrissy Teigen", "cooking"],
  ["The Food Lab", "J. Kenji López-Alt", "cooking"],
  ["Smitten Kitchen Every Day", "Deb Perelman", "cooking"],
];

const FIRST_NAMES = [
  "Jane",
  "John",
  "Maria",
  "James",
  "Priya",
  "Marcus",
  "Sam",
  "Emily",
  "Wei",
  "Fatima",
  "Liam",
  "Olivia",
  "Noah",
  "Ava",
  "Ethan",
  "Sophia",
  "Mason",
  "Isabella",
  "Lucas",
  "Mia",
  "Henry",
  "Amara",
  "Diego",
  "Chen",
  "Aisha",
  "Omar",
  "Grace",
  "Leo",
  "Nina",
  "Kofi",
  "Yuki",
  "Carlos",
  "Elena",
  "Raj",
  "Zara",
  "Tom",
  "Ruth",
  "Dana",
  "Kwame",
  "Ines",
  "Bao",
  "Mila",
  "Theo",
  "Ivy",
  "Jax",
  "Nora",
  "Finn",
  "Rosa",
  "Eli",
  "Wren",
];
const LAST_NAMES = [
  "Doe",
  "Lee",
  "Patel",
  "Rivera",
  "Smith",
  "Johnson",
  "Garcia",
  "Chen",
  "Kim",
  "Nguyen",
  "Brown",
  "Davis",
  "Miller",
  "Wilson",
  "Moore",
  "Taylor",
  "Anderson",
  "Thomas",
  "Jackson",
  "White",
  "Harris",
  "Martin",
  "Thompson",
  "Young",
  "Walker",
  "Allen",
  "King",
  "Wright",
  "Scott",
  "Green",
  "Baker",
  "Adams",
  "Nelson",
  "Carter",
  "Mitchell",
  "Perez",
  "Roberts",
  "Turner",
  "Phillips",
  "Campbell",
  "Parker",
  "Evans",
  "Edwards",
  "Collins",
  "Stewart",
  "Sanchez",
  "Morris",
  "Rogers",
  "Reed",
  "Cook",
];

const EVENT_TEMPLATES: { title: string; description: string; capacity: number | null }[] = [
  {
    title: "Author Talk: Local Mystery Writers Night",
    description: "Meet three local mystery authors for a reading and Q&A.",
    capacity: 40,
  },
  {
    title: "Kids' Storytime Saturday",
    description: "Weekly storytime for ages 3-7, hosted by our booksellers.",
    capacity: null,
  },
  {
    title: "Book Club: Contemporary Fiction",
    description: "Monthly book club meeting -- new members welcome.",
    capacity: 20,
  },
  {
    title: "Poetry Open Mic Night",
    description: "Read your own work or a favorite poem -- all welcome.",
    capacity: 30,
  },
  {
    title: "Cookbook Club: Seasonal Cooking",
    description: "Cook a recipe from this month's pick and share notes.",
    capacity: 15,
  },
  {
    title: "Sci-Fi & Fantasy Book Club",
    description: "This month: a deep dive into world-building.",
    capacity: 20,
  },
  {
    title: "Local Author Signing",
    description: "Meet a Riverside-area author and get your copy signed.",
    capacity: 50,
  },
  {
    title: "Teen Writers Workshop",
    description: "A hands-on workshop for young writers ages 13-18.",
    capacity: 12,
  },
  {
    title: "Classics Book Club",
    description: "This month: a 19th-century classic none of us have finished.",
    capacity: 20,
  },
  {
    title: "Staff Picks Night",
    description: "Booksellers share their current favorite reads.",
    capacity: null,
  },
  {
    title: "Mystery Book Club",
    description: "Whodunit discussion -- spoilers allowed after page 100.",
    capacity: 20,
  },
  {
    title: "Kids' Halloween Story Hour",
    description: "Spooky (but not too spooky) stories for young readers.",
    capacity: 25,
  },
  {
    title: "Holiday Gift Guide Night",
    description: "Staff recommendations for every reader on your list.",
    capacity: null,
  },
  {
    title: "New Year, New Shelf",
    description: "Kick off the year with a curated reading challenge.",
    capacity: 30,
  },
  {
    title: "Nonfiction Book Club",
    description: "This month: a deep-dive into a topic none of us knew much about.",
    capacity: 20,
  },
];

// Non-book merchandise. name/category + price in cents; stock is inline quantityOnHand.
// Categories mirror the existing set (mug/tote/stationery/pin/apparel/home/puzzle) --
// expanded within them rather than inventing new ones, so filtering stays meaningful.
const GIFTS: [name: string, category: string, priceCents: number][] = [
  ["Riverside Books Enamel Mug", "mug", 1495],
  ['"Just One More Chapter" Mug', "mug", 1595],
  ["Marble-Glaze Tea Mug", "mug", 1795],
  ["Classic Novels Tote Bag", "tote", 1895],
  ["Riverside Books Canvas Tote", "tote", 1695],
  ["Banned Books Tote Bag", "tote", 1995],
  ["Leather Bookmark Set", "stationery", 995],
  ["Literary Quotes Notebook", "stationery", 1295],
  ["Brass Corner Bookmark", "stationery", 795],
  ["Wax Seal Letter Kit", "stationery", 2295],
  ["Fountain Pen & Ink Set", "stationery", 2895],
  ["Book Nerd Sticker Pack", "stationery", 599],
  ["Reader's Notecard Set", "stationery", 1095],
  ["Book Lover's Enamel Pin", "pin", 795],
  ["Little Free Library Enamel Pin", "pin", 850],
  ["Cat & Book Enamel Pin", "pin", 795],
  ["Reading Socks (Pair)", "apparel", 1195],
  ['"I\'d Rather Be Reading" Tote', "tote", 1795],
  ["Bookish Beanie", "apparel", 2195],
  ["Library Scented Candle", "home", 2495],
  ["Old Book Smell Candle", "home", 2595],
  ["Cozy Reading Blanket", "home", 3995],
  ["Brass Bookend Pair", "home", 3495],
  ["Reading Nook LED Book Light", "home", 1895],
  ["1000-Piece Bookstore Puzzle", "puzzle", 1995],
  ["500-Piece Cozy Library Puzzle", "puzzle", 1695],
];

// Greeting cards, grouped by occasion.
const CARDS: [title: string, occasion: string, priceCents: number][] = [
  ["Happy Birthday, Bookworm", "birthday", 550],
  ["Birthday Balloons", "birthday", 495],
  ["Another Chapter (Birthday)", "birthday", 550],
  ["Thank You (Floral)", "thank-you", 495],
  ["Thank You (Watercolor Leaves)", "thank-you", 525],
  ["Season's Readings", "holiday", 595],
  ["Cozy Winter Wishes", "holiday", 595],
  ["Happy Reading, Happy Holidays", "holiday", 550],
  ["With Sympathy", "sympathy", 550],
  ["Thinking of You", "sympathy", 525],
  ["Congratulations!", "congratulations", 550],
  ["You Did It! (Graduation)", "congratulations", 575],
  ["Blank Card (Botanical)", "blank", 450],
  ["Blank Card (Bookshelf Illustration)", "blank", 475],
  ["Happy Anniversary", "anniversary", 595],
  ["Still My Favorite Story (Anniversary)", "anniversary", 625],
  ["Get Well Soon", "get-well", 495],
  ["Feel Better Soon (Floral)", "get-well", 495],
  ["New Home, New Chapter", "congratulations", 550],
  ["Welcome, Little One (New Baby)", "congratulations", 575],
];

const POLICIES = [
  { key: "hours", value: "Mon-Sat 9am-7pm, Sun 10am-5pm" },
  {
    key: "return_policy",
    value: "Returns accepted within 30 days with receipt, unless marked final sale.",
  },
  { key: "contact", value: "info@riversidebooks.example - (555) 123-4567" },
  {
    key: "loyalty_program",
    value: "Earn a stamp for every purchase; 10 stamps = $10 off your next order.",
  },
  { key: "shipping", value: "In-store pickup only for pre-orders -- we don't ship yet." },
  {
    key: "gift_wrapping",
    value: "Free gift wrapping available at checkout, no appointment needed.",
  },
  { key: "price_match", value: "We match listed prices from other local independent bookstores." },
  {
    key: "accessibility",
    value: "Storefront is wheelchair accessible; ask staff for the accessible entrance in back.",
  },
] as const;

const ORDER_STATUSES = ["placed", "ready_for_pickup", "completed", "cancelled"] as const;
// Weighted so most historical orders are completed, with a realistic-size active queue.
const ORDER_STATUS_WEIGHTS = [12, 10, 68, 10];

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function weightedStatus(): (typeof ORDER_STATUSES)[number] {
  const total = ORDER_STATUS_WEIGHTS.reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < ORDER_STATUSES.length; i++) {
    roll -= ORDER_STATUS_WEIGHTS[i]!;
    if (roll <= 0) return ORDER_STATUSES[i]!;
  }
  return "completed";
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

async function resetSeedTables() {
  // Never touches staff_users here -- see the module comment.
  await prisma.loyaltyTransaction.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.book.deleteMany();
  await prisma.gift.deleteMany();
  await prisma.card.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.event.deleteMany();
  await prisma.storePolicy.deleteMany();
}

async function main() {
  console.log(`Resetting seed tables (staff_users is left untouched)...`);
  await resetSeedTables();

  const booksellerNames = [
    { name: "Jordan Ruiz", role: "bookseller" },
    { name: "Alex Kim", role: "bookseller" },
  ];
  for (const b of booksellerNames) {
    const existing = await prisma.staffUser.findFirst({ where: { name: b.name } });
    if (!existing) {
      await prisma.staffUser.create({ data: b });
    }
  }
  const staff = await prisma.staffUser.findMany();
  console.log(`${staff.length} staff user(s) on file (owner + booksellers).`);

  const books: Book[] = [];
  for (let i = 0; i < BOOK_TITLES.length; i++) {
    const entry = BOOK_TITLES[i]!;
    const [title, author, category] = entry;
    const priceCents = 999 + Math.floor(Math.random() * 2000);
    const quantityOnHand = Math.floor(Math.random() * 25);
    const reorderThreshold = 2 + Math.floor(Math.random() * 3);
    const isbn = `978${String(1000000 + i).padStart(10, "0")}`;
    const adjustedBy = Math.random() < 0.35 ? pick(staff).id : null;

    const book = await prisma.book.create({
      data: {
        title,
        author,
        category,
        isbn,
        priceCents,
        inventory: {
          create: {
            quantityOnHand,
            reorderThreshold,
            status: deriveStockStatus(quantityOnHand, reorderThreshold),
            lastAdjustedById: adjustedBy,
          },
        },
      },
    });
    books.push(book);
    if ((i + 1) % 50 === 0) console.log(`  ...${i + 1}/${BOOK_TITLES.length} books`);
  }
  console.log(`Seeded ${books.length} books with inventory.`);

  await prisma.gift.createMany({
    data: GIFTS.map(([name, category, priceCents]) => ({
      name,
      category,
      priceCents,
      quantityOnHand: Math.floor(Math.random() * 25),
    })),
  });
  await prisma.card.createMany({
    data: CARDS.map(([title, occasion, priceCents]) => ({
      title,
      occasion,
      priceCents,
      quantityOnHand: Math.floor(Math.random() * 40),
    })),
  });
  console.log(`Seeded ${GIFTS.length} gifts and ${CARDS.length} cards.`);

  const customers: Customer[] = [];
  for (let i = 0; i < FIRST_NAMES.length; i++) {
    const first = FIRST_NAMES[i]!;
    const last = LAST_NAMES[i]!;
    const loyaltyStampCount = Math.floor(Math.random() * 15);
    const createdAt = daysAgo(Math.floor(Math.random() * 180));
    const useEmail = Math.random() > 0.1;
    const customer = await prisma.customer.create({
      data: {
        firstName: first,
        lastName: last,
        email: useEmail ? `${first.toLowerCase()}.${last.toLowerCase()}${i}@example.com` : null,
        phone: useEmail ? null : `555-${String(1000 + i).padStart(4, "0")}`,
        loyaltyStampCount,
        createdAt,
      },
    });
    customers.push(customer);
    if (loyaltyStampCount > 0) {
      await prisma.loyaltyTransaction.createMany({
        data: Array.from({ length: loyaltyStampCount }, () => ({
          customerId: customer.id,
          type: "earn",
          createdAt,
        })),
      });
    }
  }
  console.log(`Seeded ${customers.length} customers with loyalty history.`);

  const ORDER_COUNT = 80;
  for (let i = 0; i < ORDER_COUNT; i++) {
    const customer = pick(customers);
    const itemCount = 1 + Math.floor(Math.random() * 3);
    const items = Array.from({ length: itemCount }, () => {
      const book = pick(books);
      const quantity = 1 + Math.floor(Math.random() * 2);
      return { bookId: book.id, quantity, unitPriceCents: book.priceCents };
    });
    const totalCents = items.reduce((sum, it) => sum + it.unitPriceCents * it.quantity, 0);
    const status = weightedStatus();
    // Skew recent so "pre-orders this week" has a meaningful count; active
    // (placed/ready_for_pickup) orders lean recent, completed/cancelled spread further back.
    const age =
      status === "placed" || status === "ready_for_pickup"
        ? Math.random() * 10
        : Math.random() * 90;
    const createdAt = daysAgo(age);
    const paymentStatus =
      status === "completed"
        ? pick(["paid_online", "pay_in_store"] as const)
        : pick(["unpaid", "pay_in_store"] as const);

    await prisma.order.create({
      data: {
        customerId: customer.id,
        status,
        paymentStatus,
        totalCents,
        createdAt,
        updatedAt: createdAt,
        items: { create: items },
      },
    });
  }
  console.log(`Seeded ${ORDER_COUNT} orders across placed/ready_for_pickup/completed/cancelled.`);

  const now = Date.now();
  for (let i = 0; i < EVENT_TEMPLATES.length; i++) {
    const t = EVENT_TEMPLATES[i]!;
    // Spread from ~6 weeks in the past to ~4 months in the future.
    const offsetDays = -42 + i * 12;
    await prisma.event.create({
      data: {
        title: t.title,
        description: t.description,
        capacity: t.capacity,
        eventDate: new Date(now + offsetDays * 24 * 60 * 60 * 1000),
      },
    });
  }
  console.log(`Seeded ${EVENT_TEMPLATES.length} events.`);

  await prisma.storePolicy.createMany({ data: POLICIES.map((p) => ({ ...p })) });
  console.log(`Seeded ${POLICIES.length} store policies.`);

  console.log("Done.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
