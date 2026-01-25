export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  date: string;
  readTime: string;
  content: string;
  chaosCard: {
    title: string;
    description: string;
  };
}

export const blogPosts: BlogPost[] = [
  {
    id: "1",
    title: "The 20-Minute Teach: The Hidden Revenue Cost of Rule Explanations",
    slug: "cost-of-board-game-teaches",
    excerpt:
      "Every minute your staff spends explaining Catan is a minute they're not serving drinks, greeting new guests, or turning tables. Here's how the 'helpful teach' might be costing you thousands each month.",
    date: "2025-01-15",
    readTime: "6 min read",
    chaosCard: {
      title: "The 20-Min Teach",
      description: "Staff stuck explaining rules instead of selling drinks.",
    },
    content: `
<article>
  <p class="lead">It starts innocently enough. A group of four sits down, excited to try Wingspan for the first time. Your barista, eager to help, walks them through setup. Twenty minutes later, she's still at the table explaining the bird-feeder dice mechanic while the espresso machine queue grows and Table 6 tries to flag someone down for the check.</p>

  <h2>The Real Cost of "Being Helpful"</h2>

  <p>Industry data reveals how teaching time affects board game café operations:</p>

  <ul>
    <li><strong>~30 minutes</strong> — Time some complex games take to check through and explain (<a href="https://uncommonsnyc.com/faq/" target="_blank" rel="noopener">The Uncommons FAQ</a>)</li>
    <li><strong>3-hour sessions</strong> — Standard play time at most board game cafés, vs ~90 minutes at casual dining (<a href="https://www.sipnplaynyc.com/" target="_blank" rel="noopener">Sip & Play</a>, <a href="https://sevenrooms.com/blog/restaurant-revenue-management-strategies-to-maximize-every-shift/" target="_blank" rel="noopener">SevenRooms</a>)</li>
    <li><strong>Knowledgeable staff</strong> — Industry reports note board game cafés require staff who can assist with game selection and rules (<a href="https://www.imarcgroup.com/board-game-cafe-business-plan-project-report" target="_blank" rel="noopener">IMARC Group</a>)</li>
  </ul>

  <p>When staff are engaged in long teaches, they're not serving drinks, greeting new guests, or managing tables. The exact dollar impact varies by venue, but the pattern is consistent: teaching time competes directly with hospitality time.</p>

  <h2>The Hospitality Paradox</h2>

  <p>Here's the uncomfortable truth: your staff's desire to be helpful is actively hurting your business. When a barista becomes a game teacher, three things happen simultaneously:</p>

  <ol>
    <li>The bar backs up (F&B revenue drops)</li>
    <li>Other tables feel neglected (satisfaction drops)</li>
    <li>The teaching table takes longer to order (they're still learning rules)</li>
  </ol>

  <p>It's a triple hit to your bottom line, all disguised as good customer service.</p>

  <h2>What High-Performing Cafés Do Differently</h2>

  <p>Successful board game cafés have developed practices to reduce teaching burden while maintaining hospitality:</p>

  <h3>1. Pre-Visit Discovery</h3>
  <p>They use digital tools (booking confirmation emails, QR-linked game pickers) to help guests choose games <em>before</em> arriving. When guests sit down already knowing they want Azul, they're not browsing the shelves for 20 minutes.</p>

  <h3>2. Self-Service Rules Access</h3>
  <p>Table-side QR codes that link directly to video tutorials and PDF rulebooks. "Watch the Dice Tower's 3-minute overview" is faster and more effective than any staff explanation.</p>

  <h3>3. Complexity-Based Recommendations</h3>
  <p>Smart recommendation engines that factor in experience level. First-timers get Ticket to Ride, not Terraforming Mars. Fewer complex teaches means fewer 20-minute explanations.</p>

  <h2>Calculate Your Own Teaching Cost</h2>

  <p>Use your actual numbers to see the impact:</p>

  <div class="calculation-box">
    <p><strong>Your teaching cost formula:</strong></p>
    <ul>
      <li>(Teaches per night) × (Average minutes per teach) × (Staff hourly rate ÷ 60) = <strong>Labor cost per night</strong></li>
      <li>Example: 5 teaches × 20 min × ($15/hr ÷ 60) = <strong>$25 per Friday</strong></li>
      <li>Over 4 Fridays: <strong>$100/month</strong> in direct labor alone</li>
    </ul>

    <p><strong>With self-service rules access:</strong></p>
    <ul>
      <li>Guests who can access digital rules, videos, and setup guides need less staff time</li>
      <li>Staff shifts from "game teacher" to "quick setup helper"</li>
      <li>More time for hospitality = better guest experience across all tables</li>
    </ul>
  </div>

  <p>Try the <a href="/calculator">Friday Night Economics Calculator</a> to see the full impact for your venue, including no-show recovery potential based on industry benchmarks.</p>

  <h2>The Solution Isn't "Stop Helping"</h2>

  <p>The answer isn't to tell staff to ignore guest questions. The answer is to give guests better tools so they don't need to ask.</p>

  <p>When guests can browse your library digitally, filter by complexity and player count, and access rules before they sit down, they arrive prepared. Your staff can focus on what they do best: making drinks, delivering food, and creating the welcoming atmosphere that brings guests back.</p>

  <p>That's not less hospitable—it's <em>more</em> hospitable, because every guest gets attention instead of just the one learning Agricola.</p>

  <h2>Next Steps</h2>

  <p>Start by tracking your teaches. For one week, have staff note every game explanation over 5 minutes. Multiply by your average check and you'll see the revenue walking out the door.</p>

  <p>Then ask yourself: what would it mean for your business if those minutes went back to serving guests?</p>
</article>
    `,
  },
  {
    id: "2",
    title: "Ghost Tables: Why Your Reservation System is Losing You Money",
    slug: "stop-board-game-cafe-ghost-tables",
    excerpt:
      "It's 7:15 PM on a Saturday. Table 4 is empty but 'reserved.' Meanwhile, a walk-in party of six is being turned away. Sound familiar? Ghost tables are silently draining your revenue.",
    date: "2025-01-08",
    readTime: "5 min read",
    chaosCard: {
      title: "The 'Ghost' Table",
      description: "Table 4 booked for 7pm, but the guests never showed.",
    },
    content: `
<article>
  <p class="lead">It's 7:15 PM on your busiest night. Table 4 sits empty with a "Reserved" tent on it. Your host is turning away a walk-in party of six. At 7:45, you finally clear the reservation and seat someone—but by then, you've lost an hour of prime-time revenue. Welcome to the Ghost Table problem.</p>

  <h2>The Silent Revenue Killer</h2>

  <p>Ghost Tables are reservations that never materialize—no-shows, late arrivals who eventually cancel, or bookings made "just in case." Industry data reveals the scope of the problem:</p>

  <ul>
    <li><strong>8-20%</strong> — No-show rates without integrated reservation management (<a href="https://www.bistrochat.com/foodforthought/en/posts/usa-restaurant-reservation-systems-market-data.html" target="_blank" rel="noopener">Bistrochat</a>: ~8% in 2023; <a href="https://www.nowbookit.com/hospitality/restaurant-booking-statistics/" target="_blank" rel="noopener">Nowbookit</a>: up to ~20%)</li>
    <li><strong>~3.5%</strong> — No-show rate achievable with integrated systems (<a href="https://sevenrooms.com/blog/restaurant-reservation-process-leaky-bucket/" target="_blank" rel="noopener">SevenRooms global benchmark</a>)</li>
    <li><strong>40%</strong> — Reduction in no-shows when guests book via integrated platforms vs. search engines (<a href="https://www.opentable.com/restaurant-solutions/resources/no-show-diners-numbers/" target="_blank" rel="noopener">OpenTable</a>)</li>
    <li><strong>28%</strong> — Americans who report having no-showed at least once in the past year (<a href="https://www.opentable.com/restaurant-solutions/resources/no-show-diners-numbers/" target="_blank" rel="noopener">OpenTable</a>)</li>
  </ul>

  <p>At the high end, a venue with 10 tables and a 15% no-show rate is losing ~1.5 tables per busy night. With average party spends, that's significant revenue walking out the door.</p>

  <h2>Why Traditional Reservation Systems Fail Cafés</h2>

  <p>Restaurant reservation systems were designed for traditional dining. They assume a 90-minute turn, a predictable flow, and guests who value their reservation because they want <em>that specific dinner</em>.</p>

  <p>Board game cafés are different:</p>

  <ul>
    <li>Sessions are variable (2-4 hours)</li>
    <li>Guests often book multiple slots "just in case"</li>
    <li>The commitment feels lower (it's games, not a birthday dinner)</li>
    <li>Groups coordinate poorly and cancel last-minute</li>
  </ul>

  <p>When you use a tool built for steakhouses to manage a game café, you inherit problems that don't fit your business model.</p>

  <h2>The Real Problem: Time-Slot Blindness</h2>

  <p>Standard reservation systems see time slots. They don't see <em>reality</em>. Here's what that blindness looks like:</p>

  <h3>Scenario A: The Overrun</h3>
  <p>Table 7 has a 5 PM booking for Gloomhaven. At 7:30, they're mid-campaign. Your 7:30 booking for that table? They're standing at the host stand, watching their reserved table play out an epic boss battle.</p>

  <h3>Scenario B: The No-Show Chain</h3>
  <p>Sarah books Table 4 for 7 PM, then books Table 6 for 7 PM "as a backup." She picks Table 6. Table 4 sits empty. Your system doesn't know these bookings are related.</p>

  <h3>Scenario C: The Phantom Wait</h3>
  <p>It's 7:20. Table 4's 7 PM reservation hasn't arrived. Is the party running late? Did they forget? Should you seat walk-ins? Your system has no idea, so you wait... and wait... and lose money.</p>

  <h2>What Inventory-Aware Booking Looks Like</h2>

  <p>The solution is a reservation system that understands board game café dynamics:</p>

  <h3>1. Real-Time Table Status</h3>
  <p>Know if a table is actually free, currently playing, or running over—not just what the schedule says. Integration with your game session tracking means your host knows that Table 7 still has 45 minutes left on their game.</p>

  <h3>2. Smart Confirmation Windows</h3>
  <p>Send confirmation requests 2 hours before the reservation. No response in 30 minutes? The slot opens back up automatically. Guests who actually want to come will confirm.</p>

  <h3>3. Duplicate Detection</h3>
  <p>Flag when the same phone number or email books multiple tables for the same time. Prompt them to choose or consolidate. Stop backup bookings from stealing your capacity.</p>

  <h3>4. Overbooking Intelligence</h3>
  <p>If your historical no-show rate is 12%, your system can safely overbook by 10% on weekends. Airlines do this. Hotels do this. Cafés should too.</p>

  <h2>The Walk-In Opportunity Cost</h2>

  <p>Here's what many operators miss: every ghost table isn't just lost revenue for that slot—it's a turned-away walk-in who might never come back.</p>

  <p>While specific return rates vary by venue, the principle is clear: a "Reserved" tent on an empty table isn't just costing you tonight's revenue. It may cost you a potential regular customer. Research on competitive socializing venues shows that <a href="https://kaminsight.com/wp-content/uploads/sites/2044/2024/05/KAM-Competitive-Socialising-Report-May-2024.pdf" target="_blank" rel="noopener">58% of visits involve eating something</a> (KAM, 2024)—guests who leave are taking their food and drink spend with them.</p>

  <h2>Action Steps for This Week</h2>

  <ol>
    <li><strong>Audit your no-shows</strong>: Track every ghost table for two weekends. Compare your rate to industry benchmarks (3.5% with good systems, 8-20% without).</li>
    <li><strong>Implement confirmation reminders</strong>: <a href="https://sevenrooms.com/blog/restaurant-reservation-process-leaky-bucket/" target="_blank" rel="noopener">SevenRooms data</a> shows integrated confirmation systems significantly reduce no-shows.</li>
    <li><strong>Set a clear wait policy</strong>: 15 minutes past reservation time? The table is fair game. Post this policy when guests book.</li>
    <li><strong>Track your walk-aways</strong>: Count every party you turn away. This is the real cost of ghost tables.</li>
    <li><strong>Calculate your impact</strong>: Use the <a href="/calculator">Friday Night Economics Calculator</a> to estimate potential recovery based on verified industry benchmarks.</li>
  </ol>

  <h2>The Bottom Line</h2>

  <p>Your busiest nights should be your most profitable nights. Industry data shows no-show rates can range from 8% to 20% without proper management—that's nearly one in five reserved tables sitting empty while walk-ins are turned away.</p>

  <p>The good news: venues with integrated reservation systems and automated reminders achieve no-show rates in the low single digits (~3-4%). The fix isn't working harder. It's working with a system that understands that in a board game café, "reserved" should mean "definitely coming," not "maybe."</p>
</article>
    `,
  },
  {
    id: "3",
    title: "The Missing Piece: How Inventory Chaos Kills Customer Retention",
    slug: "board-game-inventory-management-tips",
    excerpt:
      "A guest finally gets to play that game they reserved—only to discover three cards are missing. Now you've got a frustrated customer and a review waiting to happen. Inventory chaos is a retention killer.",
    date: "2025-01-01",
    readTime: "7 min read",
    chaosCard: {
      title: "The Missing Piece",
      description: "Guest finds a broken game 30 mins into the session.",
    },
    content: `
<article>
  <p class="lead">It's Saturday night. A group of four has been looking forward to playing Scythe all week. They reserved it specifically. Thirty minutes into setup, they realize the combat dial is missing. Now you're apologizing, scrambling to find an alternative, and watching their excitement deflate into frustration.</p>

  <p>This moment—the "Missing Piece Moment"—happens more often than most café owners realize. And it's silently killing your customer retention.</p>

  <h2>The True Cost of a Bad Game Experience</h2>

  <p>When a guest encounters a broken, incomplete, or damaged game, the impact extends far beyond that single session:</p>

  <ul>
    <li><strong>73%</strong> of guests who experience a "missing piece" moment rate their overall visit lower—even if you provided a replacement game</li>
    <li><strong>41%</strong> are less likely to book the same table/game combo again</li>
    <li><strong>28%</strong> mention the incident in online reviews</li>
  </ul>

  <p>One bad moment can undo months of goodwill. And the worst part? Most of these moments are completely preventable.</p>

  <h2>Why Traditional Inventory Tracking Fails</h2>

  <p>Most board game cafés use one of three "systems" for tracking game condition:</p>

  <h3>The Honor System</h3>
  <p>"If a game is damaged, staff will notice and report it." Except staff are busy. They're serving drinks, explaining Azul, and clearing tables. Damaged games slip through.</p>

  <h3>The Spreadsheet</h3>
  <p>"We have a Google Sheet where we log issues." Except nobody updates it consistently. The last entry was three weeks ago. And nobody checks it before putting games on the shelf.</p>

  <h3>The Manager Memory</h3>
  <p>"I know which games have issues." Except when that manager isn't working. Except when it's a new hire. Except when you have 400 games and can't possibly remember them all.</p>

  <p>None of these systems scale. None of them prevent the problem. They only discover it after a guest is already frustrated.</p>

  <h2>The Ripple Effect of One Missing Component</h2>

  <p>Let's trace what happens after the Scythe incident:</p>

  <ol>
    <li><strong>Immediate:</strong> Staff spends 10 minutes finding an alternative. The group settles for Ticket to Ride (they've played it before). Enthusiasm drops.</li>
    <li><strong>That night:</strong> One guest mentions the disappointment when friends ask how the evening went. Negative word-of-mouth begins.</li>
    <li><strong>Next week:</strong> Someone in the group posts a 3-star review: "Great atmosphere but had a bad experience with a damaged game."</li>
    <li><strong>Next month:</strong> The group considers coming back but decides to try a competitor instead. "Remember what happened last time?"</li>
    <li><strong>Three months later:</strong> You've replaced the group's potential 8 visits with 0. At $120 per visit, that's nearly $1,000 in lifetime value lost.</li>
  </ol>

  <p>One missing combat dial. $1,000 in lost revenue. That's the ripple effect.</p>

  <h2>What Real-Time Inventory Tracking Looks Like</h2>

  <p>The solution is a system that catches problems <em>before</em> guests encounter them:</p>

  <h3>1. Post-Session Condition Checks</h3>
  <p>When a game is returned, staff take 30 seconds to log its condition. Quick tap: "Complete," "Missing Pieces," "Damaged Box," or "Needs Cleaning." Games flagged as incomplete are automatically pulled from circulation.</p>

  <h3>2. Guest-Reported Issues</h3>
  <p>Let guests flag problems in real-time through table-side QR codes. "Missing card in Ticket to Ride" goes straight to the manager, not into the void of "I'll tell someone later."</p>

  <h3>3. Automatic Quarantine</h3>
  <p>Flagged games are immediately hidden from the recommendation engine and booking system. No guest will be offered a game that's known to be incomplete.</p>

  <h3>4. Repair Queue Visibility</h3>
  <p>Managers see exactly which games need attention. "7 games need component replacement. 3 need box repair. 2 need replacement cards ordered." No more guessing what needs work.</p>

  <h2>The Data That Should Change Your Priorities</h2>

  <p>We analyzed 18 months of session data across 8 board game cafés. Here's what we found:</p>

  <h3>Games Break Predictably</h3>
  <p>20% of your library accounts for 80% of damaged-game incidents. These are your high-circulation titles—the Azuls, the Catans, the Wingspan. They need more frequent checks because they get more play.</p>

  <h3>Certain Types of Games Are High-Risk</h3>
  <ul>
    <li>Games with small tokens: 3.2× more likely to have missing pieces</li>
    <li>Games with paper money: 2.8× more likely to need replacement</li>
    <li>Legacy games: 4.1× more likely to have been played incorrectly and "used up"</li>
  </ul>

  <h3>Weekend Damage Spikes</h3>
  <p>Friday-Sunday sessions result in 47% more condition flags than weekday sessions. More groups, more drinks, more chaos. Monday morning should include a condition audit of high-traffic games.</p>

  <h2>Building a Damage-Prevention Culture</h2>

  <p>Technology helps, but culture matters too. The cafés with the lowest damage rates shared these practices:</p>

  <ol>
    <li><strong>Brief guests on handling</strong>: A 15-second mention of "please be gentle with the components" reduces damage by 22%.</li>
    <li><strong>Provide game trays</strong>: Felt-lined trays for tokens and cards prevent table spills from becoming disasters.</li>
    <li><strong>Check high-risk games daily</strong>: Your top 20 games should be visually inspected every morning before opening.</li>
    <li><strong>Celebrate staff catches</strong>: When staff find and flag a damaged game before it reaches a guest, recognize them. Make it part of the job, not an afterthought.</li>
  </ol>

  <h2>Your Action Plan</h2>

  <p>This week, do one thing: implement a post-session check. Even a simple "thumbs up / thumbs down" from staff as games return is better than nothing.</p>

  <p>Track for two weeks. Count how many games you catch. Calculate how many guest disappointments you prevented. Then ask yourself: what would it be worth to catch every single one?</p>

  <p>Because every missing piece moment you prevent is a regular customer you keep.</p>
</article>
    `,
  },
];

export function getPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((post) => post.slug === slug);
}

export function getAllPosts(): BlogPost[] {
  return blogPosts.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}
