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

  <p>With <strong>53% of restaurants still looking for staff going into 2024</strong> (<a href="https://resdiary.com/industry-insights/uk-ie-hospitality-industry-report-2024" target="_blank" rel="noopener">ResDiary UK & IE Hospitality Industry Report 2024</a>), every minute of staff time matters more than ever.</p>

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

  <hr class="sources-divider" />

  <h2>Sources</h2>
  <ul class="sources-list">
    <li>The Uncommons. "FAQ." <a href="https://uncommonsnyc.com/faq/" target="_blank" rel="noopener">https://uncommonsnyc.com/faq/</a></li>
    <li>Sip & Play. <a href="https://www.sipnplaynyc.com/" target="_blank" rel="noopener">https://www.sipnplaynyc.com/</a></li>
    <li>SevenRooms. "Restaurant Revenue Management Strategies to Maximize Every Shift." <a href="https://sevenrooms.com/blog/restaurant-revenue-management-strategies-to-maximize-every-shift/" target="_blank" rel="noopener">https://sevenrooms.com/blog/restaurant-revenue-management-strategies-to-maximize-every-shift/</a></li>
    <li>IMARC Group. "Board Game Cafe Business Plan." <a href="https://www.imarcgroup.com/board-game-cafe-business-plan-project-report" target="_blank" rel="noopener">https://www.imarcgroup.com/board-game-cafe-business-plan-project-report</a></li>
    <li>ResDiary. "Beyond the Booking: UK & IE Hospitality Industry Report 2024." Alex Rogers, March 12, 2024. <a href="https://resdiary.com/industry-insights/uk-ie-hospitality-industry-report-2024" target="_blank" rel="noopener">https://resdiary.com/industry-insights/uk-ie-hospitality-industry-report-2024</a></li>
  </ul>
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
    <li><strong>76% of restaurants</strong> were impacted by no-shows in 2023 (<a href="https://resdiary.com/industry-insights/uk-ie-hospitality-industry-report-2024" target="_blank" rel="noopener">ResDiary UK & IE Hospitality Industry Report 2024</a>)</li>
    <li><strong>8% of bookings</strong> resulted in no-shows in 2023, up from 5% in 2022 (<a href="https://resdiary.com/industry-insights/uk-ie-hospitality-industry-report-2024" target="_blank" rel="noopener">ResDiary</a>)</li>
    <li><strong>£3,621 average annual loss</strong> per venue due to no-shows in 2023 (<a href="https://resdiary.com/industry-insights/uk-ie-hospitality-industry-report-2024" target="_blank" rel="noopener">ResDiary</a>)</li>
    <li><strong>Up to ~20%</strong> — No-show rates can reach without active management (<a href="https://www.nowbookit.com/hospitality/restaurant-booking-statistics/" target="_blank" rel="noopener">Nowbookit</a>)</li>
    <li><strong>~3.5%</strong> — No-show rate achievable with integrated systems (<a href="https://sevenrooms.com/blog/restaurant-reservation-process-leaky-bucket/" target="_blank" rel="noopener">SevenRooms global benchmark</a>)</li>
    <li><strong>40%</strong> — Reduction in no-shows when guests book via integrated platforms vs. search engines (<a href="https://www.opentable.com/restaurant-solutions/resources/no-show-diners-numbers/" target="_blank" rel="noopener">OpenTable</a>)</li>
  </ul>

  <p>At the high end, a venue with 10 tables and a 15% no-show rate is losing ~1.5 tables per busy night. With average party spends, that's significant revenue walking out the door.</p>

  <h2>Who's Most Likely to No-Show?</h2>

  <p>The <a href="https://info.cgastrategy.com/hubfs/Go%20Technology/CGA_Zonal%20Go%20Technology%20Report%20%28Sept%2021%29.pdf" target="_blank" rel="noopener">Zonal & CGA GO Technology Report</a> reveals telling demographic patterns:</p>

  <ul>
    <li><strong>28% of 18-34 year-olds</strong> admit to not honoring reservations</li>
    <li><strong>Just 1% of those 55+</strong> admit to being no-shows</li>
    <li><strong>24% of Londoners</strong> admit to no-showing, vs 14% nationally</li>
  </ul>

  <p>If your café attracts a younger, urban crowd—likely for board game cafés—you may be dealing with higher no-show rates than the industry average.</p>

  <h2>The Reminder Effect</h2>

  <p>The same Zonal & CGA research found that reminders make a real difference:</p>

  <ul>
    <li><strong>36%</strong> of consumers who forgot their booking said they would be more likely to show up if reminded</li>
    <li><strong>13%</strong> cited "the venue didn't contact me to remind me" as their reason for no-showing</li>
    <li><strong>38%</strong> want reminders a few days in advance; <strong>28%</strong> want reminders on the day</li>
  </ul>

  <p>These are preventable no-shows. A simple automated reminder could recapture a significant portion of lost reservations.</p>

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

  <hr class="sources-divider" />

  <h2>Sources</h2>
  <ul class="sources-list">
    <li>Bistrochat/ResDiary. "USA Restaurant Reservation Systems Market Data." <a href="https://www.bistrochat.com/foodforthought/en/posts/usa-restaurant-reservation-systems-market-data.html" target="_blank" rel="noopener">https://www.bistrochat.com/foodforthought/en/posts/usa-restaurant-reservation-systems-market-data.html</a></li>
    <li>Nowbookit. "Restaurant Booking Statistics." <a href="https://www.nowbookit.com/hospitality/restaurant-booking-statistics/" target="_blank" rel="noopener">https://www.nowbookit.com/hospitality/restaurant-booking-statistics/</a></li>
    <li>SevenRooms. "Is Your Restaurant Reservation Process a Leaky Bucket?" <a href="https://sevenrooms.com/blog/restaurant-reservation-process-leaky-bucket/" target="_blank" rel="noopener">https://sevenrooms.com/blog/restaurant-reservation-process-leaky-bucket/</a></li>
    <li>OpenTable. "No-Show Diners: The Numbers." <a href="https://www.opentable.com/restaurant-solutions/resources/no-show-diners-numbers/" target="_blank" rel="noopener">https://www.opentable.com/restaurant-solutions/resources/no-show-diners-numbers/</a></li>
    <li>KAM. "Competitive Socialising Report." May 2024. <a href="https://kaminsight.com/wp-content/uploads/sites/2044/2024/05/KAM-Competitive-Socialising-Report-May-2024.pdf" target="_blank" rel="noopener">https://kaminsight.com/wp-content/uploads/sites/2044/2024/05/KAM-Competitive-Socialising-Report-May-2024.pdf</a></li>
    <li>ResDiary. "Beyond the Booking: UK & IE Hospitality Industry Report 2024." Alex Rogers, March 12, 2024. <a href="https://resdiary.com/industry-insights/uk-ie-hospitality-industry-report-2024" target="_blank" rel="noopener">https://resdiary.com/industry-insights/uk-ie-hospitality-industry-report-2024</a></li>
    <li>Zonal & CGA. "GO Technology Report." September 2021. <a href="https://info.cgastrategy.com/hubfs/Go%20Technology/CGA_Zonal%20Go%20Technology%20Report%20%28Sept%2021%29.pdf" target="_blank" rel="noopener">https://info.cgastrategy.com/hubfs/Go%20Technology/CGA_Zonal%20Go%20Technology%20Report%20%28Sept%2021%29.pdf</a></li>
  </ul>
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

  <h2>Inventory Loss: A Known Hospitality Challenge</h2>

  <p>Inventory management issues aren't unique to board game cafés. Across hospitality, keeping track of physical assets is a constant battle:</p>

  <ul>
    <li><strong>Hotels lose an estimated 20-30% of their linen inventory every year</strong> due to misplacement, damage, and wear (<a href="https://blog.hidglobal.com/rfid-hospitality-linen-management-reducing-costs-and-enhancing-guest-experience" target="_blank" rel="noopener">HID Global, 2025</a>)</li>
    <li>For board game cafés, the challenge is even more complex—hundreds of games, each with dozens of components that can go missing, get damaged, or simply wear out</li>
  </ul>

  <p>When a guest encounters a broken, incomplete, or damaged game, one bad moment can undo months of goodwill. And the worst part? Most of these moments are completely preventable.</p>

  <h2>Why Reviews Matter More Than Ever</h2>

  <p>The impact of a disappointing game experience extends beyond that single visit. According to <a href="https://www.brightlocal.com/research/local-consumer-review-survey/" target="_blank" rel="noopener">BrightLocal's 2023 Local Consumer Review Survey</a>:</p>

  <ul>
    <li><strong>76% of consumers</strong> regularly read online reviews when browsing local businesses</li>
    <li><strong>65%</strong> have left a review in response to a business request—meaning one prompt can turn a bad experience into a public one</li>
    <li><strong>60%</strong> would still consider using a business that only responds to negative reviews, highlighting that how you handle problems matters</li>
  </ul>

  <p>A single "missing piece moment" that leads to a negative review can influence dozens of potential customers who read it.</p>

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

  <p>Consider this hypothetical scenario to illustrate the potential impact:</p>

  <ol>
    <li><strong>Immediate:</strong> Staff spends 10 minutes finding an alternative. The group settles for Ticket to Ride (they've played it before). Enthusiasm drops.</li>
    <li><strong>That night:</strong> One guest mentions the disappointment when friends ask how the evening went. Negative word-of-mouth begins.</li>
    <li><strong>Next week:</strong> Someone in the group posts a 3-star review: "Great atmosphere but had a bad experience with a damaged game."</li>
    <li><strong>Next month:</strong> The group considers coming back but decides to try a competitor instead. "Remember what happened last time?"</li>
    <li><strong>Three months later:</strong> If this group would have visited 8 more times at, say, $120 per visit, that's potentially $1,000 in lifetime value at risk.</li>
  </ol>

  <p>One missing combat dial. Potentially significant lost revenue. That's the ripple effect. <em>(Note: The $120/visit figure is illustrative—your actual average check will vary.)</em></p>

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

  <h2>Common Patterns Operators Report</h2>

  <p>While board game café-specific data is limited, experienced operators consistently report these patterns:</p>

  <h3>High-Circulation Games Need More Attention</h3>
  <p>Your most popular titles—the Azuls, the Catans, the Wingspans—see the most play and therefore the most wear. Many operators find that a small portion of their library accounts for most damage incidents. These titles need more frequent condition checks.</p>

  <h3>Component Type Affects Risk</h3>
  <p>Operators commonly note that certain game characteristics correlate with higher damage rates:</p>
  <ul>
    <li><strong>Games with small tokens</strong> are more prone to missing pieces</li>
    <li><strong>Games with paper money</strong> tend to need replacement more often</li>
    <li><strong>Legacy games</strong> can be accidentally "used up" by guests unfamiliar with the format</li>
  </ul>

  <h3>Weekends Are Higher Risk</h3>
  <p>More groups, more drinks, more chaos. Many operators build Monday morning condition audits into their routine for high-traffic games.</p>

  <h2>Building a Damage-Prevention Culture</h2>

  <p>Technology helps, but culture matters too. Operators with well-maintained libraries often share these practices:</p>

  <ol>
    <li><strong>Brief guests on handling:</strong> A quick mention of "please be gentle with the components" during setup sets expectations without being heavy-handed.</li>
    <li><strong>Provide game trays:</strong> Felt-lined trays for tokens and cards prevent table spills from becoming disasters.</li>
    <li><strong>Check high-risk games daily:</strong> Your most popular games should be visually inspected every morning before opening.</li>
    <li><strong>Celebrate staff catches:</strong> When staff find and flag a damaged game before it reaches a guest, recognize them. Make it part of the job, not an afterthought.</li>
  </ol>

  <h2>Your Action Plan</h2>

  <p>This week, do one thing: implement a post-session check. Even a simple "thumbs up / thumbs down" from staff as games return is better than nothing.</p>

  <p>Track for two weeks. Count how many games you catch. Calculate how many guest disappointments you prevented. Then ask yourself: what would it be worth to catch every single one?</p>

  <p>Because every missing piece moment you prevent is a regular customer you keep.</p>

  <hr class="sources-divider" />

  <h2>Sources</h2>
  <ul class="sources-list">
    <li>HID Global. "RFID in Hospitality Linen Management: Reducing Costs and Enhancing Guest Experience." Fabrice Morini, July 2025. <a href="https://blog.hidglobal.com/rfid-hospitality-linen-management-reducing-costs-and-enhancing-guest-experience" target="_blank" rel="noopener">https://blog.hidglobal.com/rfid-hospitality-linen-management-reducing-costs-and-enhancing-guest-experience</a></li>
    <li>BrightLocal. "Local Consumer Review Survey 2023." Sammy Paget, 2023. <a href="https://www.brightlocal.com/research/local-consumer-review-survey/" target="_blank" rel="noopener">https://www.brightlocal.com/research/local-consumer-review-survey/</a></li>
  </ul>
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
