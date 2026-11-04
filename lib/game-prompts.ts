export interface GameChoicePrompt {
  id: number;
  a: string;
  b: string;
}

export interface DarePrompt {
  id: number;
  text: string;
  category: string;
  marriedOnly?: boolean;
}

export const THIS_OR_THAT_PROMPTS: GameChoicePrompt[] = [
  { id: 1, a: "Early prayer", b: "Late gist" },
  { id: 2, a: "Cook dinner together", b: "Order cozy takeout" },
  { id: 3, a: "Morning devotion", b: "Night prayer" },
  { id: 4, a: "Big church fellowship", b: "Small home group" },
  { id: 5, a: "Deep conversations", b: "Playful laughter" },
  { id: 6, a: "Beach sunset walk", b: "Cozy blanket reading" },
  { id: 7, a: "Words of affirmation", b: "Acts of service" },
  { id: 8, a: "Road trip adventure", b: "Staycation retreat" },
  { id: 9, a: "Worship in car", b: "Worship with candles" },
  { id: 10, a: "Handwritten letter", b: "Surprise sweet treat" },
  { id: 11, a: "Hold hands walking", b: "Forehead kisses" },
  { id: 12, a: "Early bird weekend", b: "Lazy morning cuddle" },
  { id: 13, a: "Fast and pray day", b: "Feast and celebrate day" },
  { id: 14, a: "Family dinner", b: "Table for two" },
  { id: 15, a: "Board game night", b: "Worship album listen" },
  { id: 16, a: "Spontaneous date", b: "Planned itinerary" },
  { id: 17, a: "Coffee date", b: "Ice cream stroll" },
  { id: 18, a: "City lights view", b: "Starry night sky" },
  { id: 19, a: "Matching outfits", b: "Complimentary colors" },
  { id: 20, a: "Talk it out now", b: "Cool off then talk" },
];

export const WOULD_YOU_RATHER_PROMPTS: GameChoicePrompt[] = [
  { id: 1, a: "Lead worship monthly", b: "Host small group weekly" },
  { id: 2, a: "Go on a mission trip together", b: "Sponsor a kingdom community" },
  { id: 3, a: "Memorize Proverbs together", b: "Read Psalms aloud by candlelight" },
  { id: 4, a: "Fast together for breakthrough", b: "Give anonymous gift to a family" },
  { id: 5, a: "Serve Sunday school together", b: "Serve hospitality team together" },
  { id: 6, a: "A 48-hour silent prayer retreat", b: "A 3-day praise conference" },
  { id: 7, a: "Write a daily gratitude journal", b: "Speak a daily audio prayer blessing" },
  { id: 8, a: "A private mountain cabin retreat", b: "A peaceful seaside prayer walk" },
  { id: 9, a: "Cook for our church elders", b: "Mentor a younger courting couple" },
  { id: 10, a: "Always pray before big decisions", b: "Always read scripture before bed" },
  { id: 11, a: "One year no social media", b: "One year dedicated tithe match" },
  { id: 12, a: "Surprise anniversary pilgrimage", b: "Surprise acoustic worship evening" },
  { id: 13, a: "Sing spontaneous duets in car", b: "Listen to marriage sermon podcasts" },
  { id: 14, a: "Plant a garden together", b: "Build a home prayer altar together" },
  { id: 15, a: "Wake up at 5am for joint prayer", b: "Midnight prayer watch together" },
  { id: 16, a: "Volunteer at homeless shelter", b: "Pack care packages for missionaries" },
  { id: 17, a: "Read Bible in a year together", b: "Study Ephesians verse-by-verse" },
  { id: 18, a: "An unplugged weekend in nature", b: "A cozy bookstore Bible search date" },
  { id: 19, a: "Host monthly couple dinners", b: "Host weekly couple prayer hours" },
  { id: 20, a: "Be remembered for great faith", b: "Be remembered for unconditional love" },
];

export const DARE_KINGDOM_PROMPTS: DarePrompt[] = [
  { id: 1, text: "Send a 30s voice note praying for me", category: "Prayer" },
  { id: 2, text: "Make a doodle of our future home in 60s", category: "Creative" },
  { id: 3, text: "Write 3 things you love about partner and share", category: "Words" },
  { id: 4, text: "Do 10 jumping jacks together on video call", category: "Playful" },
  { id: 5, text: "Sing your favorite worship chorus aloud right now", category: "Worship" },
  { id: 6, text: "Send a photo making the sweetest smile you can", category: "Photo" },
  { id: 7, text: "Send an audio blessing quoting Numbers 6:24-26", category: "Blessing" },
  { id: 8, text: "Write a 4-line rhyme about how God brought us together", category: "Creative" },
  { id: 9, text: "Tell me one moment this week you felt God's peace", category: "Testimony" },
  { id: 10, text: "Plan a 15-minute phone-free devotional for tomorrow", category: "Intentional" },
  { id: 11, text: "Send a photo of something in your room that reminds you of me", category: "Affection" },
  { id: 12, text: "Give 3 sincere compliments about my godly character", category: "Affirmation" },
  { id: 13, text: "Speak a 20-second prayer of gratitude for our future", category: "Prayer" },
  { id: 14, text: "Compliment one quality of mine that reflects Christ", category: "Spiritual" },
  { id: 15, text: "Send your favorite photo of us with a 1-sentence caption", category: "Memory" },
  // Married only dares (wholesome, romantic, strictly non-graphic):
  { id: 16, text: "Write a handwritten love note and hide it for partner", category: "Romance", marriedOnly: true },
  { id: 17, text: "Plan a secret surprise date for this weekend", category: "Romance", marriedOnly: true },
  { id: 18, text: "Give a gentle 5-minute shoulder massage with soft worship", category: "Affection", marriedOnly: true },
  { id: 19, text: "Whisper 3 prayers of blessing over our marriage", category: "Prayer", marriedOnly: true },
  { id: 20, text: "Hold hands for 2 minutes in complete silence and breathe", category: "Closeness", marriedOnly: true },
];

export const TRUTH_FALLBACK_PROMPTS: string[] = [
  "What was the exact moment you realized you loved me?",
  "What is one prayer you have prayed for our relationship?",
  "What makes you feel most spiritually connected to me?",
  "What does a godly apology look like to you?",
  "What is your favorite memory of us praying together?",
  "What is one area of life where you need my encouragement most?",
  "How did your family handle conflict growing up?",
  "What is a kingdom dream you want us to pursue together?",
  "What small daily habit makes you feel deeply valued?",
  "What is your biggest hope for our marriage?",
  "What is one scripture that has anchored you in hard times?",
  "What helps you feel safe enough to share your deepest feelings?",
  "What is your favorite thing about my relationship with God?",
  "What does lingering together without phones look like for you?",
  "How can I better support you when you feel overwhelmed?",
];

export interface QuizQuestion {
  id: number;
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
}

export const DEFAULT_QUIZ_TEMPLATES: QuizQuestion[] = [
  {
    id: 1,
    question: "What is my absolute favorite comfort food?",
    options: [
      "Warm pasta or noodles",
      "Cozy homemade soup",
      "Crispy roasted chicken",
      "Sweet pastries or dessert",
    ],
    correctIndex: 0,
  },
  {
    id: 2,
    question: "What is my ideal Saturday morning?",
    options: [
      "Slow coffee & Bible reading",
      "Brisk morning walk or run",
      "Sleeping in with pancakes",
      "Spontaneous road trip adventure",
    ],
    correctIndex: 0,
  },
  {
    id: 3,
    question: "What makes me feel most cherished by you?",
    options: [
      "Heartfelt words of affirmation",
      "A warm, lingering hug",
      "An unexpected thoughtful favor",
      "Undivided quality time together",
    ],
    correctIndex: 0,
  },
  {
    id: 4,
    question: "What is my dream getaway with you?",
    options: [
      "Quiet mountain cabin in nature",
      "Peaceful seaside beach cottage",
      "Historic city exploration & cafes",
      "Cozy countryside prayer retreat",
    ],
    correctIndex: 0,
  },
  {
    id: 5,
    question: "What sound or music lifts my spirit instantly?",
    options: [
      "Acoustic worship chords",
      "Joyful energetic gospel praise",
      "Calm instrumental piano",
      "Gentle rain outside the window",
    ],
    correctIndex: 0,
  },
];

export interface BibleTriviaQuestion {
  id: number;
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
}

export const BIBLE_TRIVIA_QUESTIONS: BibleTriviaQuestion[] = [
  {
    id: 1,
    question: "What is 1 Corinthians 13 famously known as?",
    options: ["The Faith Chapter", "The Love Chapter", "The Wisdom Chapter", "The Grace Chapter"],
    correctIndex: 1,
    explanation: "1 Corinthians 13 teaches that love is patient, kind, does not envy, and never fails.",
  },
  {
    id: 2,
    question: "In Ecclesiastes 4:12, a cord of how many strands is not quickly broken?",
    options: ["Two strands", "Three strands", "Four strands", "Seven strands"],
    correctIndex: 1,
    explanation: "A three-strand cord symbolizes husband, wife, and God at the center together.",
  },
  {
    id: 3,
    question: "In Ephesians 5:25, how are husbands instructed to love their wives?",
    options: ["As Christ loved the church", "With strict rules", "Only when easy", "As business partners"],
    correctIndex: 0,
    explanation: "Husbands are called to self-sacrificing, cherishing love just as Christ loved the church.",
  },
  {
    id: 4,
    question: "Where did Jesus perform His first miracle at a wedding celebration?",
    options: ["Jerusalem", "Cana in Galilee", "Nazareth", "Bethlehem"],
    correctIndex: 1,
    explanation: "Jesus honored marriage by performing His very first miracle turning water to wine at Cana.",
  },
  {
    id: 5,
    question: "According to Proverbs 31:10, a wife of noble character is worth far more than what?",
    options: ["Silver", "Gold", "Rubies", "Pearls"],
    correctIndex: 2,
    explanation: "Scripture celebrates godly character and wisdom as far more precious than rubies.",
  },
  {
    id: 6,
    question: "In Genesis 2:18, what did God call the companion He made for man?",
    options: ["A ruler", "A helper suitable for him", "An apprentice", "A distant advisor"],
    correctIndex: 1,
    explanation: "Eve was created as 'ezer kenegdo'—a strong, complementary partner standing eye to eye.",
  },
  {
    id: 7,
    question: "Which Old Testament book celebrates holy romantic love and commitment?",
    options: ["Song of Songs", "Lamentations", "Habakkuk", "Leviticus"],
    correctIndex: 0,
    explanation: "Song of Solomon celebrates godly affection, passion, and covenant commitment.",
  },
  {
    id: 8,
    question: "What does 1 Peter 4:8 say that love covers over?",
    options: ["All mistakes", "A multitude of sins", "Every disagreement", "All worries"],
    correctIndex: 1,
    explanation: "Above all, love each other deeply, because love covers over a multitude of sins with grace.",
  },
  {
    id: 9,
    question: "Who declared, 'Where you go I will go, and where you stay I will stay'?",
    options: ["Ruth", "Esther", "Sarah", "Rachel"],
    correctIndex: 0,
    explanation: "Ruth's steadfast covenant devotion is one of the most famous declarations of loyalty in scripture.",
  },
  {
    id: 10,
    question: "In Colossians 3:14, what virtue is called the bond of perfect unity?",
    options: ["Knowledge", "Patience", "Love", "Ambition"],
    correctIndex: 2,
    explanation: "Over all virtues put on love, which binds them all together in perfect harmony.",
  },
  {
    id: 11,
    question: "According to Proverbs 18:22, he who finds a wife finds what?",
    options: ["A heavy burden", "A good thing and favor from the Lord", "Great wealth", "A quiet life"],
    correctIndex: 1,
    explanation: "Finding a godly spouse is celebrated as receiving divine favor from the Lord.",
  },
  {
    id: 12,
    question: "Which fruit of the Spirit listed in Galatians 5:22 is named first?",
    options: ["Joy", "Love", "Peace", "Kindness"],
    correctIndex: 1,
    explanation: "The fruit of the Spirit begins with Love, the foundation of joy, peace, and patience.",
  },
  {
    id: 13,
    question: "In Matthew 19:6, what does Jesus say human beings must not separate?",
    options: ["What God has joined together", "Family and friends", "Work and prayer", "Traditions and laws"],
    correctIndex: 0,
    explanation: "'Therefore what God has joined together, let no one separate.'",
  },
  {
    id: 14,
    question: "Which kingdom couple worked together as tentmakers and taught Apollos?",
    options: ["Priscilla and Aquila", "Ananias and Sapphira", "Abraham and Keturah", "Boaz and Naomi"],
    correctIndex: 0,
    explanation: "Priscilla and Aquila were an inspiring kingdom couple in both ministry and tentmaking.",
  },
  {
    id: 15,
    question: "According to Philippians 2:3, how should we value others in relationship?",
    options: ["Above ourselves in humility", "Based on their performance", "Equally to strangers", "Only if they value us"],
    correctIndex: 0,
    explanation: "Humility and honoring each other above ourselves creates peaceful, lasting partnership.",
  },
  {
    id: 16,
    question: "In Romans 12:10, what are believers encouraged to do in showing honor?",
    options: ["Compete for honor", "Outdo one another in showing honor", "Wait to be honored", "Demand honor"],
    correctIndex: 1,
    explanation: "A godly couple thrives when both partners gently strive to honor each other first.",
  },
  {
    id: 17,
    question: "What godly attitude did Boaz demonstrate toward Ruth in his field?",
    options: ["Generosity and protective care", "Suspicion", "Indifference", "Strict rules"],
    correctIndex: 0,
    explanation: "Boaz acted as a godly protector and provider, showing gracious kindness to Ruth.",
  },
  {
    id: 18,
    question: "According to 1 John 4:18, what does perfect love drive out?",
    options: ["Doubt", "Fear", "Sadness", "Pride"],
    correctIndex: 1,
    explanation: "There is no fear in love. But perfect love drives out fear, bringing complete peace.",
  },
  {
    id: 19,
    question: "In Genesis 29:20, Jacob served 7 years for Rachel, and how did they seem to him?",
    options: ["Like an eternity", "Like only a few days because of his love", "Full of sorrow", "A heavy labor"],
    correctIndex: 1,
    explanation: "Scripture beautifully notes that seven years seemed like mere days because of his love.",
  },
  {
    id: 20,
    question: "In Proverbs 27:17, what sharpens iron just as one friend sharpens another?",
    options: ["Gold", "Silver", "Iron", "Stone"],
    correctIndex: 2,
    explanation: "As iron sharpens iron, so partners sharpen and encourage each other in spiritual maturity.",
  },
  {
    id: 21,
    question: "According to James 1:19, what should every believer be quick to do?",
    options: ["Quick to speak", "Quick to listen", "Quick to judge", "Quick to correct"],
    correctIndex: 1,
    explanation: "Being quick to listen and slow to anger keeps communication gentle and Christ-centered.",
  },
  {
    id: 22,
    question: "In Ephesians 4:26, what does scripture advise regarding anger before sleeping?",
    options: ["Hold onto it for days", "Do not let the sun go down while angry", "Express it loudly", "Ignore it forever"],
    correctIndex: 1,
    explanation: "Resolving differences before the sun sets protects peace and keeps hearts soft.",
  },
  {
    id: 23,
    question: "What was Isaac doing in Genesis 24:63 when he first saw Rebekah?",
    options: ["Meditating in prayer in the field", "Sleeping in his tent", "Trading in town", "Traveling far away"],
    correctIndex: 0,
    explanation: "Isaac was meditating in prayer in the evening when God brought Rebekah into his life.",
  },
  {
    id: 24,
    question: "According to 1 Corinthians 13:4, what is the very first attribute of love?",
    options: ["Love is patient", "Love is powerful", "Love is exciting", "Love is boastful"],
    correctIndex: 0,
    explanation: "'Love is patient, love is kind.' Patience gives grace room to flourish.",
  },
  {
    id: 25,
    question: "In Romans 12:2, how are we transformed to discern God's good will?",
    options: ["By the renewing of our mind", "By copying the culture", "By working harder", "By seeking popularity"],
    correctIndex: 0,
    explanation: "Renewing our minds with scripture guides couple decisions in God's perfect will.",
  },
  {
    id: 26,
    question: "Which Queen stepped out in courage 'for such a time as this'?",
    options: ["Esther", "Deborah", "Hannah", "Miriam"],
    correctIndex: 0,
    explanation: "Queen Esther walked in kingdom purpose and courageous faith to save her people.",
  },
  {
    id: 27,
    question: "According to 1 Thessalonians 5:11, what should couples do for each other?",
    options: ["Encourage one another and build up", "Critique weaknesses", "Keep a score of flaws", "Compare with others"],
    correctIndex: 0,
    explanation: "Daily encouragement strengthens both hearts and turns your home into a sanctuary.",
  },
  {
    id: 28,
    question: "In John 15:12, what command did Jesus give to His followers?",
    options: ["Love each other as I have loved you", "Win every debate", "Seek the highest praise", "Worry about tomorrow"],
    correctIndex: 0,
    explanation: "Christ's love is our benchmark: patient, sacrificial, and unconditional.",
  },
  {
    id: 29,
    question: "According to Proverbs 15:1, what turns away wrath in communication?",
    options: ["A harsh argument", "A gentle answer", "Cold silence", "Proving who is right"],
    correctIndex: 1,
    explanation: "A gentle response diffuses tension and creates an atmosphere of safety and love.",
  },
  {
    id: 30,
    question: "What is the greatest of the three enduring virtues in 1 Corinthians 13:13?",
    options: ["Faith", "Hope", "Love", "Knowledge"],
    correctIndex: 2,
    explanation: "And now these three remain: faith, hope, and love. But the greatest of these is love.",
  },
];
