import type { Player, PlayerPosition, AdvancedMetrics } from '../types';

const generateWeeklyProjections = (base: number) => {
    const projections: { [week: number]: number } = {};
    for (let i = 1; i <= 17; i++) {
        projections[i] = parseFloat((base * (1 + (Math.random() - 0.5) * 0.4)).toFixed(1));
    }
    return projections;
};

// Comprehensive 2024 Player Database
const playersData: Partial<Player>[] = [
    // Elite RBs
    { name: 'Christian McCaffrey', position: 'RB', team: 'SF', rank: 1, adp: 1.1, auctionValue: 72, bye: 9, tier: 1, age: 28, stats: { projection: 390, lastYear: 410, vorp: 125.8, weeklyProjections: generateWeeklyProjections(22.9) }, bio: "The ultimate dual-threat weapon and the consensus #1 overall pick. A true league-winner when healthy.", advancedMetrics: { snapCountPct: 91, targetSharePct: 22, redZoneTouches: 58 } },
    { name: 'Breece Hall', position: 'RB', team: 'NYJ', rank: 2, adp: 2.3, auctionValue: 68, bye: 12, tier: 1, age: 23, stats: { projection: 355, lastYear: 290, vorp: 110.1, weeklyProjections: generateWeeklyProjections(20.9) }, bio: "Explosive, fully recovered, and ready to dominate behind an improved offensive line. Huge upside in both rushing and receiving.", advancedMetrics: { snapCountPct: 75, targetSharePct: 25, redZoneTouches: 31 } },
    { name: 'Bijan Robinson', position: 'RB', team: 'ATL', rank: 3, adp: 3.5, auctionValue: 65, bye: 5, tier: 1, age: 22, stats: { projection: 340, lastYear: 270, vorp: 105.5, weeklyProjections: generateWeeklyProjections(20.0) }, bio: "Freed from Arthur Smith's questionable usage, Robinson is poised for a massive season under a new offensive scheme that will feature him heavily.", advancedMetrics: { snapCountPct: 68, targetSharePct: 18, redZoneTouches: 25 } },
    { name: 'Kyren Williams', position: 'RB', team: 'LAR', rank: 4, adp: 5.8, auctionValue: 62, bye: 6, tier: 1, age: 24, stats: { projection: 320, lastYear: 335, vorp: 101.3, weeklyProjections: generateWeeklyProjections(18.8) }, bio: "A volume monster who proved to be a reliable workhorse. With a clear path to touches, he's a high-floor RB1.", advancedMetrics: { snapCountPct: 85, targetSharePct: 15, redZoneTouches: 42 } },
    { name: 'Jonathan Taylor', position: 'RB', team: 'IND', rank: 7, adp: 8.2, auctionValue: 58, bye: 14, tier: 2, age: 25, stats: { projection: 310, lastYear: 240, vorp: 95.7, weeklyProjections: generateWeeklyProjections(18.2) }, bio: "Paired with a dynamic rushing QB in Anthony Richardson, Taylor has the talent to lead the league in rushing in any given season.", advancedMetrics: { snapCountPct: 78, targetSharePct: 12, redZoneTouches: 38 } },
    
    // Elite WRs
    { name: 'CeeDee Lamb', position: 'WR', team: 'DAL', rank: 5, adp: 4.1, auctionValue: 69, bye: 7, tier: 1, age: 25, stats: { projection: 380, lastYear: 395, vorp: 120.4, weeklyProjections: generateWeeklyProjections(22.4) }, bio: "The NFL's target leader from last season. Lamb is a PPR machine and the focal point of a high-powered Cowboys offense.", contract: { years: 5, amount: '$140M', guaranteed: '$70M' }, advancedMetrics: { snapCountPct: 89, targetSharePct: 33, redZoneTouches: 28 } },
    { name: 'Tyreek Hill', position: 'WR', team: 'MIA', rank: 6, adp: 5.2, auctionValue: 67, bye: 12, tier: 1, age: 30, stats: { projection: 370, lastYear: 375, vorp: 118.9, weeklyProjections: generateWeeklyProjections(21.8) }, bio: "The fastest man in football. Hill's game-breaking speed makes him a threat to score from anywhere on the field.", advancedMetrics: { snapCountPct: 85, targetSharePct: 31, redZoneTouches: 22 } },
    { name: 'Amon-Ra St. Brown', position: 'WR', team: 'DET', rank: 8, adp: 9.1, auctionValue: 60, bye: 5, tier: 1, age: 24, stats: { projection: 350, lastYear: 360, vorp: 112.0, weeklyProjections: generateWeeklyProjections(20.6) }, bio: "The definition of a target-hog slot receiver. Incredibly reliable with a massive target share in a potent offense.", contract: { years: 4, amount: '$120M', guaranteed: '$77M' }, advancedMetrics: { snapCountPct: 90, targetSharePct: 29, redZoneTouches: 24 } },
    { name: 'Garrett Wilson', position: 'WR', team: 'NYJ', rank: 9, adp: 10.5, auctionValue: 57, bye: 12, tier: 2, age: 24, stats: { projection: 330, lastYear: 250, vorp: 104.2, weeklyProjections: generateWeeklyProjections(19.4) }, bio: "An elite talent who has produced with subpar QB play. Now paired with Aaron Rodgers, his ceiling is astronomical.", advancedMetrics: { snapCountPct: 94, targetSharePct: 30, redZoneTouches: 19 } },
    { name: 'Ja\'Marr Chase', position: 'WR', team: 'CIN', rank: 10, adp: 7.5, auctionValue: 63, bye: 12, tier: 1, age: 24, stats: { projection: 360, lastYear: 310, vorp: 115.6, weeklyProjections: generateWeeklyProjections(21.2) }, bio: "With Joe Burrow back healthy, Chase returns to his rightful place as a top-tier fantasy WR with massive weekly upside.", advancedMetrics: { snapCountPct: 92, targetSharePct: 28, redZoneTouches: 26 } },
    { name: 'A.J. Brown', position: 'WR', team: 'PHI', rank: 11, adp: 11.8, auctionValue: 56, bye: 5, tier: 2, age: 27, stats: { projection: 325, lastYear: 340, vorp: 102.1, weeklyProjections: generateWeeklyProjections(19.1) }, advancedMetrics: { snapCountPct: 91, targetSharePct: 27, redZoneTouches: 23 } },
    { name: 'Marvin Harrison Jr.', position: 'WR', team: 'ARI', rank: 12, adp: 12.4, auctionValue: 52, bye: 11, tier: 2, age: 22, stats: { projection: 315, lastYear: 0, vorp: 99.8, weeklyProjections: generateWeeklyProjections(18.5) }, bio: "A truly generational WR prospect stepping into a role as the clear #1 target for Kyler Murray. High expectations from day one.", advancedMetrics: { snapCountPct: 93, targetSharePct: 26, redZoneTouches: 20 } },
    { name: 'Chris Olave', position: 'WR', team: 'NO', rank: 13, adp: 14.1, auctionValue: 50, bye: 12, tier: 2, age: 24, stats: { projection: 305, lastYear: 280, vorp: 95.3, weeklyProjections: generateWeeklyProjections(17.9) }, advancedMetrics: { snapCountPct: 92, targetSharePct: 25, redZoneTouches: 18 } },

    // Tier 2 RBs
    { name: 'Saquon Barkley', position: 'RB', team: 'PHI', rank: 14, adp: 13.9, auctionValue: 54, bye: 5, tier: 2, age: 27, stats: { projection: 295, lastYear: 260, vorp: 90.1, weeklyProjections: generateWeeklyProjections(17.4) }, bio: "Now running behind the best offensive line of his career, Barkley has a massive ceiling in the Eagles' potent offense.", advancedMetrics: { snapCountPct: 80, targetSharePct: 16, redZoneTouches: 40 } },
    { name: 'Travis Etienne Jr.', position: 'RB', team: 'JAX', rank: 15, adp: 15.5, auctionValue: 51, bye: 12, tier: 2, age: 25, stats: { projection: 290, lastYear: 305, vorp: 88.4, weeklyProjections: generateWeeklyProjections(17.1) }, advancedMetrics: { snapCountPct: 82, targetSharePct: 14, redZoneTouches: 35 } },
    { name: 'Jahmyr Gibbs', position: 'RB', team: 'DET', rank: 16, adp: 16.2, auctionValue: 53, bye: 5, tier: 2, age: 22, stats: { projection: 300, lastYear: 315, vorp: 92.5, weeklyProjections: generateWeeklyProjections(17.6) }, bio: "Explosive and efficient, Gibbs is a home-run threat every time he touches the ball. Shares work but has incredible upside.", advancedMetrics: { snapCountPct: 55, targetSharePct: 17, redZoneTouches: 28 } },
    { name: 'Derrick Henry', position: 'RB', team: 'BAL', rank: 17, adp: 20.1, auctionValue: 48, bye: 14, tier: 3, age: 30, stats: { projection: 280, lastYear: 270, vorp: 85.2, weeklyProjections: generateWeeklyProjections(16.5) }, advancedMetrics: { snapCountPct: 65, targetSharePct: 8, redZoneTouches: 55 } },
    { name: 'De\'Von Achane', position: 'RB', team: 'MIA', rank: 18, adp: 18.5, auctionValue: 49, bye: 12, tier: 3, age: 22, stats: { projection: 275, lastYear: 295, vorp: 84.1, weeklyProjections: generateWeeklyProjections(16.2) }, advancedMetrics: { snapCountPct: 50, targetSharePct: 13, redZoneTouches: 24 } },

    // Elite QBs
    { name: 'Josh Allen', position: 'QB', team: 'BUF', rank: 19, adp: 17.7, auctionValue: 48, bye: 12, tier: 1, age: 28, stats: { projection: 410, lastYear: 420, vorp: 110.2, weeklyProjections: generateWeeklyProjections(24.1) }, bio: "The fantasy QB1 for a reason. Allen's rushing upside gives him a floor and ceiling that are unmatched at the position.", contract: { years: 6, amount: '$258M', guaranteed: '$150M' } },
    { name: 'Jalen Hurts', position: 'QB', team: 'PHI', rank: 20, adp: 19.3, auctionValue: 47, bye: 5, tier: 1, age: 26, stats: { projection: 395, lastYear: 405, vorp: 105.1, weeklyProjections: generateWeeklyProjections(23.2) }, bio: "The 'Tush Push' maestro. Hurts is a touchdown machine, both through the air and on the ground." },
    { name: 'Patrick Mahomes', position: 'QB', team: 'KC', rank: 21, adp: 22.1, auctionValue: 45, bye: 6, tier: 1, age: 28, stats: { projection: 380, lastYear: 360, vorp: 95.5, weeklyProjections: generateWeeklyProjections(22.4) } },
    { name: 'Lamar Jackson', position: 'QB', team: 'BAL', rank: 22, adp: 24.5, auctionValue: 44, bye: 14, tier: 1, age: 27, stats: { projection: 375, lastYear: 385, vorp: 93.8, weeklyProjections: generateWeeklyProjections(22.1) } },

    // Elite TEs
    { name: 'Sam LaPorta', position: 'TE', team: 'DET', rank: 23, adp: 25.8, auctionValue: 40, bye: 5, tier: 1, age: 23, stats: { projection: 280, lastYear: 295, vorp: 90.5, weeklyProjections: generateWeeklyProjections(16.5) }, bio: "Broke rookie records and established himself as a premier fantasy TE. A reliable target for Jared Goff.", advancedMetrics: { snapCountPct: 82, targetSharePct: 23, redZoneTouches: 18 } },
    { name: 'Travis Kelce', position: 'TE', team: 'KC', rank: 24, adp: 28.1, auctionValue: 38, bye: 6, tier: 1, age: 34, stats: { projection: 265, lastYear: 280, vorp: 85.2, weeklyProjections: generateWeeklyProjections(15.6) }, advancedMetrics: { snapCountPct: 88, targetSharePct: 24, redZoneTouches: 21 } },
    
    // Remaining Players by Position
    // Quarterbacks (QB)
    { name: 'C.J. Stroud', position: 'QB', team: 'HOU', rank: 30, adp: 32.5, auctionValue: 35, bye: 14, tier: 2, age: 22, stats: { projection: 360, lastYear: 340, vorp: 88.0, weeklyProjections: generateWeeklyProjections(21.2) } },
    { name: 'Anthony Richardson', position: 'QB', team: 'IND', rank: 35, adp: 38.0, auctionValue: 33, bye: 14, tier: 2, age: 22, stats: { projection: 350, lastYear: 150, vorp: 85.0, weeklyProjections: generateWeeklyProjections(20.6) } },
    { name: 'Joe Burrow', position: 'QB', team: 'CIN', rank: 40, adp: 45.2, auctionValue: 30, bye: 12, tier: 2, age: 27, stats: { projection: 340, lastYear: 250, vorp: 82.0, weeklyProjections: generateWeeklyProjections(20.0) } },
    { name: 'Kyler Murray', position: 'QB', team: 'ARI', rank: 45, adp: 50.1, auctionValue: 28, bye: 11, tier: 3, age: 27, stats: { projection: 330, lastYear: 280, vorp: 78.5, weeklyProjections: generateWeeklyProjections(19.4) } },
    { name: 'Dak Prescott', position: 'QB', team: 'DAL', rank: 50, adp: 55.6, auctionValue: 25, bye: 7, tier: 3, age: 31, stats: { projection: 320, lastYear: 370, vorp: 75.0, weeklyProjections: generateWeeklyProjections(18.8) } },
    { name: 'Jordan Love', position: 'QB', team: 'GB', rank: 58, adp: 62.3, auctionValue: 22, bye: 10, tier: 3, age: 25, stats: { projection: 310, lastYear: 330, vorp: 70.2, weeklyProjections: generateWeeklyProjections(18.2) } },
    { name: 'Brock Purdy', position: 'QB', team: 'SF', rank: 65, adp: 70.1, auctionValue: 20, bye: 9, tier: 4, age: 24, stats: { projection: 300, lastYear: 320, vorp: 68.1, weeklyProjections: generateWeeklyProjections(17.6) } },
    { name: 'Kirk Cousins', position: 'QB', team: 'ATL', rank: 75, adp: 80.5, auctionValue: 18, bye: 5, tier: 4, age: 36, stats: { projection: 290, lastYear: 200, vorp: 65.3, weeklyProjections: generateWeeklyProjections(17.1) } },
    { name: 'Tua Tagovailoa', position: 'QB', team: 'MIA', rank: 85, adp: 90.2, auctionValue: 15, bye: 12, tier: 4, age: 26, stats: { projection: 285, lastYear: 300, vorp: 63.8, weeklyProjections: generateWeeklyProjections(16.8) } },
    { name: 'Jared Goff', position: 'QB', team: 'DET', rank: 95, adp: 100.0, auctionValue: 12, bye: 5, tier: 5, age: 29, stats: { projection: 280, lastYear: 290, vorp: 62.1, weeklyProjections: generateWeeklyProjections(16.5) } },
    { name: 'Jayden Daniels', position: 'QB', team: 'WAS', rank: 100, adp: 105.5, auctionValue: 10, bye: 14, tier: 5, age: 23, stats: { projection: 270, lastYear: 0, vorp: 60.0, weeklyProjections: generateWeeklyProjections(15.9) } },
    { name: 'Caleb Williams', position: 'QB', team: 'CHI', rank: 108, adp: 112.1, auctionValue: 9, bye: 7, tier: 5, age: 22, stats: { projection: 265, lastYear: 0, vorp: 58.7, weeklyProjections: generateWeeklyProjections(15.6) } },
    { name: 'Trevor Lawrence', position: 'QB', team: 'JAX', rank: 115, adp: 120.3, auctionValue: 8, bye: 12, tier: 5, age: 24, stats: { projection: 260, lastYear: 270, vorp: 55.4, weeklyProjections: generateWeeklyProjections(15.3) } },
    { name: 'Matthew Stafford', position: 'QB', team: 'LAR', rank: 125, adp: 130.8, auctionValue: 6, bye: 6, tier: 6, age: 36, stats: { projection: 250, lastYear: 260, vorp: 52.1, weeklyProjections: generateWeeklyProjections(14.7) } },
    { name: 'Justin Herbert', position: 'QB', team: 'LAC', rank: 130, adp: 135.2, auctionValue: 5, bye: 5, tier: 6, age: 26, stats: { projection: 245, lastYear: 255, vorp: 50.0, weeklyProjections: generateWeeklyProjections(14.4) } },
    { name: 'Aaron Rodgers', position: 'QB', team: 'NYJ', rank: 140, adp: 145.9, auctionValue: 4, bye: 12, tier: 6, age: 40, stats: { projection: 240, lastYear: 5, vorp: 48.3, weeklyProjections: generateWeeklyProjections(14.1) } },
    { name: 'J.J. McCarthy', position: 'QB', team: 'MIN', rank: 160, adp: 170.0, auctionValue: 2, bye: 6, tier: 7, age: 21, stats: { projection: 220, lastYear: 0, vorp: 40.0, weeklyProjections: generateWeeklyProjections(12.9) } },

    // Running Backs (RB)
    { name: 'Isiah Pacheco', position: 'RB', team: 'KC', rank: 25, adp: 28.8, auctionValue: 45, bye: 6, tier: 3, age: 25, stats: { projection: 250, lastYear: 260, vorp: 75.3, weeklyProjections: generateWeeklyProjections(14.7) } },
    { name: 'Josh Jacobs', position: 'RB', team: 'GB', rank: 26, adp: 30.1, auctionValue: 44, bye: 10, tier: 3, age: 26, stats: { projection: 245, lastYear: 230, vorp: 73.8, weeklyProjections: generateWeeklyProjections(14.4) } },
    { name: 'James Cook', position: 'RB', team: 'BUF', rank: 32, adp: 36.4, auctionValue: 40, bye: 12, tier: 4, age: 24, stats: { projection: 230, lastYear: 245, vorp: 70.2, weeklyProjections: generateWeeklyProjections(13.5) } },
    { name: 'Kenneth Walker III', position: 'RB', team: 'SEA', rank: 38, adp: 42.9, auctionValue: 38, bye: 10, tier: 4, age: 23, stats: { projection: 220, lastYear: 235, vorp: 68.1, weeklyProjections: generateWeeklyProjections(12.9) } },
    { name: 'Rachaad White', position: 'RB', team: 'TB', rank: 42, adp: 48.2, auctionValue: 36, bye: 11, tier: 4, age: 25, stats: { projection: 215, lastYear: 270, vorp: 65.7, weeklyProjections: generateWeeklyProjections(12.6) } },
    { name: 'Joe Mixon', position: 'RB', team: 'HOU', rank: 48, adp: 54.1, auctionValue: 34, bye: 14, tier: 5, age: 28, stats: { projection: 210, lastYear: 225, vorp: 63.4, weeklyProjections: generateWeeklyProjections(12.4) } },
    { name: 'Alvin Kamara', position: 'RB', team: 'NO', rank: 55, adp: 60.3, auctionValue: 32, bye: 12, tier: 5, age: 29, stats: { projection: 205, lastYear: 240, vorp: 61.9, weeklyProjections: generateWeeklyProjections(12.1) } },
    { name: 'Zamir White', position: 'RB', team: 'LV', rank: 60, adp: 65.8, auctionValue: 30, bye: 10, tier: 5, age: 24, stats: { projection: 200, lastYear: 100, vorp: 60.0, weeklyProjections: generateWeeklyProjections(11.8) } },
    { name: 'James Conner', position: 'RB', team: 'ARI', rank: 68, adp: 74.2, auctionValue: 28, bye: 11, tier: 6, age: 29, stats: { projection: 190, lastYear: 210, vorp: 57.1, weeklyProjections: generateWeeklyProjections(11.2) } },
    { name: 'David Montgomery', position: 'RB', team: 'DET', rank: 72, adp: 78.9, auctionValue: 26, bye: 5, tier: 6, age: 27, stats: { projection: 185, lastYear: 220, vorp: 55.3, weeklyProjections: generateWeeklyProjections(10.9) } },
    { name: 'Brian Robinson Jr.', position: 'RB', team: 'WAS', rank: 78, adp: 85.3, auctionValue: 24, bye: 14, tier: 6, age: 25, stats: { projection: 180, lastYear: 195, vorp: 53.0, weeklyProjections: generateWeeklyProjections(10.6) } },
    { name: 'Zack Moss', position: 'RB', team: 'CIN', rank: 82, adp: 90.1, auctionValue: 22, bye: 12, tier: 7, age: 26, stats: { projection: 175, lastYear: 180, vorp: 51.5, weeklyProjections: generateWeeklyProjections(10.3) } },
    { name: 'Jaylen Wright', position: 'RB', team: 'MIA', rank: 88, adp: 95.8, auctionValue: 20, bye: 12, tier: 7, age: 21, stats: { projection: 170, lastYear: 0, vorp: 50.0, weeklyProjections: generateWeeklyProjections(10.0) } },
    { name: 'Jonathon Brooks', position: 'RB', team: 'CAR', rank: 92, adp: 100.2, auctionValue: 18, bye: 11, tier: 7, age: 21, stats: { projection: 165, lastYear: 0, vorp: 48.1, weeklyProjections: generateWeeklyProjections(9.7) } },

    // Wide Receivers (WR)
    { name: 'Drake London', position: 'WR', team: 'ATL', rank: 27, adp: 29.9, auctionValue: 42, bye: 5, tier: 3, age: 23, stats: { projection: 290, lastYear: 220, vorp: 90.3, weeklyProjections: generateWeeklyProjections(17.1) } },
    { name: 'Nico Collins', position: 'WR', team: 'HOU', rank: 28, adp: 31.2, auctionValue: 41, bye: 14, tier: 3, age: 25, stats: { projection: 285, lastYear: 300, vorp: 88.8, weeklyProjections: generateWeeklyProjections(16.8) } },
    { name: 'Michael Pittman Jr.', position: 'WR', team: 'IND', rank: 33, adp: 37.1, auctionValue: 39, bye: 14, tier: 3, age: 26, stats: { projection: 280, lastYear: 275, vorp: 85.7, weeklyProjections: generateWeeklyProjections(16.5) } },
    { name: 'Davante Adams', position: 'WR', team: 'LV', rank: 36, adp: 40.5, auctionValue: 37, bye: 10, tier: 4, age: 31, stats: { projection: 275, lastYear: 280, vorp: 84.1, weeklyProjections: generateWeeklyProjections(16.2) } },
    { name: 'Brandon Aiyuk', position: 'WR', team: 'SF', rank: 37, adp: 41.8, auctionValue: 38, bye: 9, tier: 4, age: 26, stats: { projection: 270, lastYear: 285, vorp: 82.5, weeklyProjections: generateWeeklyProjections(15.9) } },
    { name: 'George Pickens', position: 'WR', team: 'PIT', rank: 43, adp: 49.3, auctionValue: 35, bye: 9, tier: 4, age: 23, stats: { projection: 260, lastYear: 240, vorp: 78.4, weeklyProjections: generateWeeklyProjections(15.3) } },
    { name: 'Jaylen Waddle', position: 'WR', team: 'MIA', rank: 44, adp: 50.1, auctionValue: 36, bye: 12, tier: 4, age: 25, stats: { projection: 265, lastYear: 250, vorp: 80.0, weeklyProjections: generateWeeklyProjections(15.6) } },
    { name: 'Rashee Rice', position: 'WR', team: 'KC', rank: 46, adp: 52.8, auctionValue: 34, bye: 6, tier: 5, age: 24, stats: { projection: 255, lastYear: 265, vorp: 76.9, weeklyProjections: generateWeeklyProjections(15.0) } },
    { name: 'Tank Dell', position: 'WR', team: 'HOU', rank: 52, adp: 58.2, auctionValue: 33, bye: 14, tier: 5, age: 24, stats: { projection: 250, lastYear: 200, vorp: 75.3, weeklyProjections: generateWeeklyProjections(14.7) } },
    { name: 'Terry McLaurin', position: 'WR', team: 'WAS', rank: 56, adp: 62.9, auctionValue: 31, bye: 14, tier: 5, age: 29, stats: { projection: 245, lastYear: 230, vorp: 73.8, weeklyProjections: generateWeeklyProjections(14.4) } },
    { name: 'Jordan Addison', position: 'WR', team: 'MIN', rank: 61, adp: 68.4, auctionValue: 29, bye: 6, tier: 6, age: 22, stats: { projection: 240, lastYear: 255, vorp: 72.1, weeklyProjections: generateWeeklyProjections(14.1) } },
    { name: 'Zay Flowers', position: 'WR', team: 'BAL', rank: 64, adp: 71.3, auctionValue: 28, bye: 14, tier: 6, age: 24, stats: { projection: 235, lastYear: 220, vorp: 70.6, weeklyProjections: generateWeeklyProjections(13.8) } },
    { name: 'Rome Odunze', position: 'WR', team: 'CHI', rank: 66, adp: 73.8, auctionValue: 27, bye: 7, tier: 6, age: 22, stats: { projection: 230, lastYear: 0, vorp: 69.0, weeklyProjections: generateWeeklyProjections(13.5) } },
    { name: 'Malik Nabers', position: 'WR', team: 'NYG', rank: 70, adp: 77.1, auctionValue: 26, bye: 11, tier: 6, age: 21, stats: { projection: 225, lastYear: 0, vorp: 67.5, weeklyProjections: generateWeeklyProjections(13.2) } },
    
    // Tight Ends (TE)
    { name: 'Trey McBride', position: 'TE', team: 'ARI', rank: 34, adp: 39.5, auctionValue: 34, bye: 11, tier: 2, age: 24, stats: { projection: 240, lastYear: 230, vorp: 75.1, weeklyProjections: generateWeeklyProjections(14.1) } },
    { name: 'Mark Andrews', position: 'TE', team: 'BAL', rank: 41, adp: 46.8, auctionValue: 32, bye: 14, tier: 2, age: 28, stats: { projection: 230, lastYear: 200, vorp: 70.8, weeklyProjections: generateWeeklyProjections(13.5) } },
    { name: 'Kyle Pitts', position: 'TE', team: 'ATL', rank: 49, adp: 55.1, auctionValue: 30, bye: 5, tier: 3, age: 23, stats: { projection: 220, lastYear: 180, vorp: 65.4, weeklyProjections: generateWeeklyProjections(12.9) } },
    { name: 'Evan Engram', position: 'TE', team: 'JAX', rank: 57, adp: 64.2, auctionValue: 28, bye: 12, tier: 3, age: 30, stats: { projection: 210, lastYear: 240, vorp: 62.1, weeklyProjections: generateWeeklyProjections(12.4) } },
    { name: 'George Kittle', position: 'TE', team: 'SF', rank: 63, adp: 70.9, auctionValue: 26, bye: 9, tier: 3, age: 30, stats: { projection: 200, lastYear: 230, vorp: 58.7, weeklyProjections: generateWeeklyProjections(11.8) } },
    { name: 'Dalton Kincaid', position: 'TE', team: 'BUF', rank: 73, adp: 81.3, auctionValue: 24, bye: 12, tier: 4, age: 24, stats: { projection: 190, lastYear: 180, vorp: 55.3, weeklyProjections: generateWeeklyProjections(11.2) } },
    { name: 'Jake Ferguson', position: 'TE', team: 'DAL', rank: 80, adp: 88.6, auctionValue: 22, bye: 7, tier: 4, age: 25, stats: { projection: 180, lastYear: 210, vorp: 52.0, weeklyProjections: generateWeeklyProjections(10.6) } },
    { name: 'Brock Bowers', position: 'TE', team: 'LV', rank: 90, adp: 98.7, auctionValue: 20, bye: 10, tier: 5, age: 21, stats: { projection: 170, lastYear: 0, vorp: 48.6, weeklyProjections: generateWeeklyProjections(10.0) } },

    // Kickers (K)
    { name: 'Justin Tucker', position: 'K', team: 'BAL', rank: 150, adp: 155.1, auctionValue: 5, bye: 14, tier: 1, age: 34, stats: { projection: 150, lastYear: 148, vorp: 30.0, weeklyProjections: generateWeeklyProjections(8.8) } },
    { name: 'Jake Moody', position: 'K', team: 'SF', rank: 155, adp: 160.2, auctionValue: 4, bye: 9, tier: 1, age: 24, stats: { projection: 145, lastYear: 152, vorp: 28.0, weeklyProjections: generateWeeklyProjections(8.5) } },
    { name: 'Brandon Aubrey', position: 'K', team: 'DAL', rank: 162, adp: 168.4, auctionValue: 3, bye: 7, tier: 2, age: 29, stats: { projection: 140, lastYear: 160, vorp: 26.0, weeklyProjections: generateWeeklyProjections(8.2) } },
    { name: 'Evan McPherson', position: 'K', team: 'CIN', rank: 170, adp: 175.9, auctionValue: 2, bye: 12, tier: 2, age: 25, stats: { projection: 135, lastYear: 130, vorp: 24.0, weeklyProjections: generateWeeklyProjections(7.9) } },
    { name: 'Harrison Butker', position: 'K', team: 'KC', rank: 175, adp: 180.1, auctionValue: 1, bye: 6, tier: 3, age: 29, stats: { projection: 130, lastYear: 135, vorp: 22.0, weeklyProjections: generateWeeklyProjections(7.6) } },

    // Defenses (DST)
    { name: 'Baltimore Ravens', position: 'DST', team: 'BAL', rank: 145, adp: 150.3, auctionValue: 6, bye: 14, tier: 1, age: 28, stats: { projection: 130, lastYear: 140, vorp: 25.0, weeklyProjections: generateWeeklyProjections(7.6) } },
    { name: 'Cleveland Browns', position: 'DST', team: 'CLE', rank: 148, adp: 154.6, auctionValue: 5, bye: 10, tier: 1, age: 27, stats: { projection: 125, lastYear: 135, vorp: 23.0, weeklyProjections: generateWeeklyProjections(7.4) } },
    { name: 'Kansas City Chiefs', position: 'DST', team: 'KC', rank: 158, adp: 165.7, auctionValue: 4, bye: 6, tier: 2, age: 28, stats: { projection: 120, lastYear: 125, vorp: 21.0, weeklyProjections: generateWeeklyProjections(7.1) } },
    { name: 'New York Jets', position: 'DST', team: 'NYJ', rank: 165, adp: 172.8, auctionValue: 3, bye: 12, tier: 2, age: 26, stats: { projection: 115, lastYear: 120, vorp: 19.0, weeklyProjections: generateWeeklyProjections(6.8) } },
    { name: 'Dallas Cowboys', position: 'DST', team: 'DAL', rank: 172, adp: 178.5, auctionValue: 2, bye: 7, tier: 3, age: 27, stats: { projection: 110, lastYear: 130, vorp: 17.0, weeklyProjections: generateWeeklyProjections(6.5) } },
];

let lastId = 0;
let fullPlayersData: Player[] = playersData.map((p, index) => ({
    id: ++lastId,
    name: p.name!,
    position: p.position!,
    team: p.team!,
    rank: p.rank || index + 1,
    adp: p.adp || p.rank || index + 1,
    bye: p.bye!,
    tier: p.tier!,
    age: p.age!,
    auctionValue: p.auctionValue!,
    stats: p.stats!,
    bio: p.bio,
    scoutingReport: p.scoutingReport,
    contract: p.contract,
    injuryHistory: p.injuryHistory,
    newsFeed: p.newsFeed,
    astralIntelligence: p.astralIntelligence,
    advancedMetrics: p.advancedMetrics,
}));

// Fill up to 400 players for a full draft
let nextRank = fullPlayersData.length + 1;
const teamsCycle = ['CAR', 'NE', 'DEN', 'NYG', 'TEN', 'WAS', 'LAC', 'CHI', 'SEA', 'TB', 'PIT', 'MIN'];
const positionsCycle: PlayerPosition[] = ['WR', 'RB', 'WR', 'RB', 'WR', 'TE', 'QB'];

while (fullPlayersData.length < 400) {
    const pos = positionsCycle[fullPlayersData.length % positionsCycle.length];
    const baseProj = Math.max(20, 180 - nextRank * 0.5);
    fullPlayersData.push({
        id: ++lastId,
        name: `Player ${lastId}`,
        position: pos,
        team: teamsCycle[lastId % teamsCycle.length],
        rank: nextRank,
        adp: nextRank + Math.floor(Math.random() * 10) - 5,
        bye: (lastId % 14) + 4,
        tier: 8 + Math.floor(nextRank / 25),
        age: 21 + Math.floor(Math.random() * 8),
        auctionValue: Math.max(1, 15 - Math.floor(nextRank / 20)),
        stats: {
            projection: parseFloat(baseProj.toFixed(1)),
            lastYear: parseFloat((baseProj * (1 + (Math.random() - 0.5) * 0.3)).toFixed(1)),
            vorp: parseFloat((baseProj * 0.2).toFixed(1)),
            weeklyProjections: generateWeeklyProjections(baseProj / 17),
        },
    });
    nextRank++;
}

export const players: Player[] = fullPlayersData.sort((a,b) => a.rank - b.rank);