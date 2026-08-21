const SUPABASE_URL = 'https://rwtqrxaabkcueuboqbju.supabase.co';
const SUPABASE_KEY = 'sb_publishable_hu5zlS1aivNht1gzRgbuww_WIbCr2eL'; 

const { createClient } = window.supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

let currentEditMatchId = null;
let selectedScoreT1 = null;
let selectedScoreT2 = null;

window.hofData = {}; 

async function init() {
    const { data: matches, error } = await db.from('matches').select('*').order('id', { ascending: true });
    if (error) { console.error("Fout bij laden:", error); return; }
    buildDashboard(matches);
}

function toggleSection(sectionId, iconId) {
    const content = document.getElementById(sectionId);
    const icon = document.getElementById(iconId);
    if (content.classList.contains('collapsed')) {
        content.classList.remove('collapsed');
        icon.innerText = '▲';
    } else {
        content.classList.add('collapsed');
        icon.innerText = '▼';
    }
}

function buildDashboard(matches) {
    const playedMatches = matches.filter(m => m.score_t1 !== null && m.score_t2 !== null);
    const nextMatchRow = matches.find(m => m.score_t1 === null);
    const currentWeek = nextMatchRow ? nextMatchRow.week : 30;
    
    const statusEl = document.getElementById('status-text');
    if(statusEl) statusEl.innerText = `Status voor aanvang van Week ${currentWeek}`;

    renderMatchdayWidgets(matches, currentWeek);
    calculateAndRenderLeaderboards(matches, playedMatches);
}

function renderMatchdayWidgets(matches, currentWeek) {
    const pastWeek = currentWeek > 1 ? currentWeek - 1 : 1;
    const pastMatches = matches.filter(m => m.week === pastWeek);
    let pastHTML = `<div class="matchday-header"><h2>⏪ W${pastWeek} MATCHES</h2><span class="matchday-date">${formatDate(pastMatches[0]?.match_date || new Date())}</span></div><div class="matchday-content"><p class="rust-info">RUST: <span class="badge-rest">${pastMatches[0]?.rest_1} & ${pastMatches[0]?.rest_2}</span></p>`;
    pastMatches.forEach(m => pastHTML += buildMatchRow(m));
    const pastWidget = document.getElementById('past-match-widget');
    if(pastWidget) pastWidget.innerHTML = pastHTML + `</div>`;

    const nextWeekMatches = matches.filter(m => m.week === currentWeek);
    if(nextWeekMatches.length > 0) {
        let nextHTML = `<div class="matchday-header"><h2>⏭️ W${currentWeek} MATCHES</h2><span class="matchday-date">${formatDate(nextWeekMatches[0].match_date)}</span></div><div class="matchday-content"><p class="rust-info">RUST: <span class="badge-rest">${nextWeekMatches[0].rest_1} & ${nextWeekMatches[0].rest_2}</span></p>`;
        nextWeekMatches.forEach(m => nextHTML += buildMatchRow(m));
        const nextWidget = document.getElementById('next-match-widget');
        if(nextWidget) nextWidget.innerHTML = nextHTML + `</div>`;
    }
}

function buildMatchRow(m) {
    const isPlayed = m.score_t1 !== null;
    let scoreDisplay = `<span class="vs">VS</span>`;
    if (isPlayed) {
        const t1Wins = m.score_t1 > m.score_t2;
        scoreDisplay = `<span class="score ${t1Wins ? 'win-score' : 'lose-score'}">${m.score_t1} - ${m.score_t2}</span>`;
    }
    return `
        <div class="result-row">
            <span class="team ${isPlayed && m.score_t1 > m.score_t2 ? 'win' : ''}">${m.t1_p1} & ${m.t1_p2}</span>
            ${scoreDisplay}
            <span class="team ${isPlayed && m.score_t2 > m.score_t1 ? 'win' : ''}">${m.t2_p1} & ${m.t2_p2}</span>
            <button class="edit-btn" onclick="openModal(${m.id}, '${m.t1_p1} & ${m.t1_p2}', '${m.t2_p1} & ${m.t2_p2}', ${m.score_t1}, ${m.score_t2})">✎</button>
        </div>`;
}

function calculateAndRenderLeaderboards(allMatches, playedMatches) {
    const players = ['Jorden', 'Yarni', 'Lars', 'Vince', 'Kristof', 'Sammy'];
    let stats = {};
    let playerStreaks = {};
    
    // Initialiseer gigantische lege stats
    players.forEach(p => {
        stats[p] = { games: 0, wins: 0, losses: 0, gamesWon: 0, gamesLost: 0, totalGamesPlayed: 0, bagelsGiven: 0, bagelsEaten: 0, thrillsWon: 0, thrillsLost: 0 };
        playerStreaks[p] = { currentWin: 0, maxWin: 0, currentLoss: 0, maxLoss: 0 };
    });

    let duoStats = {};

    playedMatches.forEach(m => {
        const t1 = [m.t1_p1, m.t1_p2].sort();
        const t2 = [m.t2_p1, m.t2_p2].sort();
        const d1 = t1.join(' & '); const d2 = t2.join(' & ');
        
        if (!duoStats[d1]) duoStats[d1] = { games: 0, wins: 0, losses: 0, gamesWon: 0, gamesLost: 0, bagelsG: 0, bagelsE: 0, thrillsW: 0, thrillsL: 0 };
        if (!duoStats[d2]) duoStats[d2] = { games: 0, wins: 0, losses: 0, gamesWon: 0, gamesLost: 0, bagelsG: 0, bagelsE: 0, thrillsW: 0, thrillsL: 0 };

        const t1Wins = m.score_t1 > m.score_t2;
        const matchTotalGames = m.score_t1 + m.score_t2;

        const processPlayer = (p, isWinner, scWin, scLose) => {
            stats[p].games++;
            stats[p].gamesWon += scWin;
            stats[p].gamesLost += scLose;
            stats[p].totalGamesPlayed += matchTotalGames;
            if (isWinner) {
                stats[p].wins++;
                playerStreaks[p].currentWin++; playerStreaks[p].currentLoss = 0;
                if(playerStreaks[p].currentWin > playerStreaks[p].maxWin) playerStreaks[p].maxWin = playerStreaks[p].currentWin;
            } else {
                stats[p].losses++;
                playerStreaks[p].currentLoss++; playerStreaks[p].currentWin = 0;
                if(playerStreaks[p].currentLoss > playerStreaks[p].maxLoss) playerStreaks[p].maxLoss = playerStreaks[p].currentLoss;
            }
        };

        t1.forEach(p => processPlayer(p, t1Wins, m.score_t1, m.score_t2));
        t2.forEach(p => processPlayer(p, !t1Wins, m.score_t2, m.score_t1));

        duoStats[d1].games++; duoStats[d2].games++;
        duoStats[d1].gamesWon += m.score_t1; duoStats[d1].gamesLost += m.score_t2;
        duoStats[d2].gamesWon += m.score_t2; duoStats[d2].gamesLost += m.score_t1;

        if (t1Wins) { duoStats[d1].wins++; duoStats[d2].losses++; } 
        else { duoStats[d2].wins++; duoStats[d1].losses++; }

        // SOLO & DUO Special Stats
        if (m.score_t1 === 6 && m.score_t2 === 0) { 
            t1.forEach(p => stats[p].bagelsGiven++); t2.forEach(p => stats[p].bagelsEaten++); 
            duoStats[d1].bagelsG++; duoStats[d2].bagelsE++;
        }
        if (m.score_t2 === 6 && m.score_t1 === 0) { 
            t2.forEach(p => stats[p].bagelsGiven++); t1.forEach(p => stats[p].bagelsEaten++); 
            duoStats[d2].bagelsG++; duoStats[d1].bagelsE++;
        }
        if (m.score_t1 === 6 && m.score_t2 === 5) {
            t1.forEach(p => stats[p].thrillsWon++); t2.forEach(p => stats[p].thrillsLost++);
            duoStats[d1].thrillsW++; duoStats[d2].thrillsL++;
        }
        if (m.score_t2 === 6 && m.score_t1 === 5) {
            t2.forEach(p => stats[p].thrillsWon++); t1.forEach(p => stats[p].thrillsLost++);
            duoStats[d2].thrillsW++; duoStats[d1].thrillsL++;
        }
    });

    // ==========================================
    // KLASSEMENT TABELLEN VULLEN
    // ==========================================
    const ranking = Object.keys(stats).map(p => ({
        name: p, ...stats[p], saldo: stats[p].gamesWon - stats[p].gamesLost
    })).sort((a, b) => b.wins - a.wins || b.saldo - a.saldo);

    let indHTML = '';
    ranking.forEach((r, idx) => {
        const sign = r.saldo > 0 ? '+' : '';
        const saldoClass = r.saldo > 0 ? 'positive' : (r.saldo < 0 ? 'negative' : 'neutral');
        indHTML += `<tr class="rank-${idx+1}"><td>${idx+1}</td><td><strong>${r.name}</strong></td><td>${r.games}</td><td>${r.wins}</td><td>${r.losses}</td><td class="${saldoClass}">${sign}${r.saldo} (${r.gamesWon}-${r.gamesLost})</td></tr>`;
    });
    const indLbord = document.getElementById('individual-leaderboard');
    if(indLbord) indLbord.innerHTML = indHTML;

    const duoRankingStats = Object.keys(duoStats).map(d => {
        const s = duoStats[d];
        return { duo: d, ...s, perc: s.games === 0 ? 0 : Math.round((s.wins / s.games) * 100), avgGames: s.games === 0 ? 0 : ((s.gamesWon+s.gamesLost)/s.games).toFixed(1) };
    });
    
    const duoRanking = [...duoRankingStats].sort((a, b) => b.perc - a.perc || b.wins - a.wins);
    let duoHTML = '';
    duoRanking.forEach((r, idx) => {
        const pClass = r.perc > 50 ? 'positive' : (r.perc === 0 ? 'neutral' : 'negative');
        duoHTML += `<tr class="rank-${idx+1}"><td>${idx+1}</td><td><strong>${r.duo}</strong></td><td>${r.wins} - ${r.losses}</td><td class="${pClass}">${r.perc}%</td></tr>`;
    });
    const duoLbord = document.getElementById('duo-leaderboard');
    if(duoLbord) duoLbord.innerHTML = duoHTML;

    // ==========================================
    // HALL OF FAME: EXTREME VERSIE
    // ==========================================
    const hasPlayed = ranking[0].games > 0;
    
    // SOLO Sorteringen
    const sortedByMuur = [...ranking].filter(r=>r.games > 0).sort((a,b) => (a.gamesLost/a.games) - (b.gamesLost/b.games));
    const sortedBySchietschijf = [...ranking].filter(r=>r.games > 0).sort((a,b) => b.gamesLost - a.gamesLost);
    const sortedBySlechtSaldo = [...ranking].filter(r=>r.games > 0).sort((a,b) => a.saldo - b.saldo);
    const sortedByMarathon = [...ranking].filter(r=>r.games > 0).sort((a,b) => b.totalGamesPlayed - a.totalGamesPlayed);
    const sortedByWinPerc = [...ranking].filter(r=>r.games >= 3).sort((a,b) => (b.wins/b.games) - (a.wins/a.games) || b.saldo - a.saldo);
    const sortedByStreakWin = [...players].map(p => ({name: p, val: playerStreaks[p].maxWin})).sort((a,b) => b.val - a.val);
    const sortedByStreakLoss = [...players].map(p => ({name: p, val: playerStreaks[p].maxLoss})).sort((a,b) => b.val - a.val);
    const sortedByBagelG = [...players].map(p => ({name: p, val: stats[p].bagelsGiven})).sort((a,b) => b.val - a.val);
    const sortedByBagelE = [...players].map(p => ({name: p, val: stats[p].bagelsEaten})).sort((a,b) => b.val - a.val);
    const sortedByThrillsW = [...players].map(p => ({name: p, val: stats[p].thrillsWon})).sort((a,b) => b.val - a.val);
    const sortedByThrillsL = [...players].map(p => ({name: p, val: stats[p].thrillsLost})).sort((a,b) => b.val - a.val);

    // DUO Sorteringen
    const sortedByDuoWins = [...duoRankingStats].sort((a,b) => b.wins - a.wins);
    const sortedByDuoLosses = [...duoRankingStats].sort((a,b) => b.losses - a.losses);
    const sortedByDuoPerc = [...duoRankingStats].filter(d => d.games >= 2).sort((a,b) => b.perc - a.perc || b.wins - a.wins);
    const sortedByDuoSaldo = [...duoRankingStats].filter(d => d.games > 0).sort((a,b) => (b.gamesWon - b.gamesLost) - (a.gamesWon - a.gamesLost));
    const sortedByDuoMuur = [...duoRankingStats].filter(d => d.games >= 2).sort((a,b) => (a.gamesLost/a.games) - (b.gamesLost/b.games));
    const sortedByDuoLangeMatch = [...duoRankingStats].filter(d => d.games >= 2).sort((a,b) => b.avgGames - a.avgGames);
    const sortedByDuoKorteMatch = [...duoRankingStats].filter(d => d.games >= 2).sort((a,b) => a.avgGames - b.avgGames);
    const sortedByDuoBagelsG = [...duoRankingStats].sort((a,b) => b.bagelsG - a.bagelsG);
    const sortedByDuoBagelsE = [...duoRankingStats].sort((a,b) => b.bagelsE - a.bagelsE);
    const sortedByDuoThrillsW = [...duoRankingStats].sort((a,b) => b.thrillsW - a.thrillsW);
    const sortedByDuoThrillsL = [...duoRankingStats].sort((a,b) => b.thrillsL - a.thrillsL);

    const soloAwards = [
        { id: 's_koning', icon: '👑', label: 'De Koning (Winst)', check: () => hasPlayed ? ranking[0].name : null, headers: ['#', 'Speler', 'Winst', 'Saldo'], getRows: () => ranking.map((r, i) => [i+1, r.name, r.wins, (r.saldo>0?'+':'')+r.saldo]) },
        { id: 's_haai', icon: '🦈', label: 'De Haai (Beste Saldo)', check: () => hasPlayed ? `${ranking[0].name} (+${ranking[0].saldo})` : null, headers: ['#', 'Speler', 'Saldo', 'Winst'], getRows: () => [...ranking].sort((a,b) => b.saldo - a.saldo).map((r, i) => [i+1, r.name, (r.saldo>0?'+':'')+r.saldo, r.wins]) },
        { id: 's_spons', icon: '🧽', label: 'De Spons (Slechtste Saldo)', check: () => hasPlayed && sortedBySlechtSaldo[0].saldo < 0 ? `${sortedBySlechtSaldo[0].name} (${sortedBySlechtSaldo[0].saldo})` : null, headers: ['#', 'Speler', 'Saldo', 'Tegen'], getRows: () => sortedBySlechtSaldo.map((r, i) => [i+1, r.name, r.saldo, r.gamesLost]) },
        { id: 's_onverslaanbaar', icon: '🥇', label: 'Onverslaanbaar (Win %, min 3m)', check: () => sortedByWinPerc.length > 0 && sortedByWinPerc[0].wins > 0 ? `${sortedByWinPerc[0].name} (${Math.round((sortedByWinPerc[0].wins/sortedByWinPerc[0].games)*100)}%)` : null, headers: ['#', 'Speler', 'Win %', 'Winst'], getRows: () => sortedByWinPerc.map((r, i) => [i+1, r.name, Math.round((r.wins/r.games)*100)+'%', r.wins]) },
        { id: 's_muur', icon: '🧱', label: 'De Muur (Minste Tegen p/m)', check: () => hasPlayed ? `${sortedByMuur[0].name} (${(sortedByMuur[0].gamesLost/sortedByMuur[0].games).toFixed(1)})` : null, headers: ['#', 'Speler', 'Gem. Tegen', 'Matches'], getRows: () => sortedByMuur.map((r, i) => [i+1, r.name, (r.gamesLost/r.games).toFixed(2), r.games]) },
        { id: 's_schiet', icon: '🎯', label: 'Schietschijf (Totaal Tegen)', check: () => hasPlayed ? `${sortedBySchietschijf[0].name} (${sortedBySchietschijf[0].gamesLost})` : null, headers: ['#', 'Speler', 'Totaal Tegen', 'Matches'], getRows: () => sortedBySchietschijf.map((r, i) => [i+1, r.name, r.gamesLost, r.games]) },
        { id: 's_marathon', icon: '🏃‍♂️', label: 'Marathonman (Gespeelde Games)', check: () => hasPlayed ? `${sortedByMarathon[0].name} (${sortedByMarathon[0].totalGamesPlayed})` : null, headers: ['#', 'Speler', 'Totaal Games', 'Matches'], getRows: () => sortedByMarathon.map((r, i) => [i+1, r.name, r.totalGamesPlayed, r.games]) },
        { id: 's_fire', icon: '🔥', label: 'On Fire (Win Streak)', check: () => sortedByStreakWin[0].val >= 2 ? `${sortedByStreakWin[0].name} (${sortedByStreakWin[0].val})` : null, headers: ['#', 'Speler', 'Max Streak', 'Huidige'], getRows: () => sortedByStreakWin.map((r, i) => [i+1, r.name, r.val, playerStreaks[r.name].currentWin]) },
        { id: 's_pech', icon: '🧊', label: 'Pechvogel (Loss Streak)', check: () => sortedByStreakLoss[0].val >= 2 ? `${sortedByStreakLoss[0].name} (${sortedByStreakLoss[0].val})` : null, headers: ['#', 'Speler', 'Max Streak', 'Huidige'], getRows: () => sortedByStreakLoss.map((r, i) => [i+1, r.name, r.val, playerStreaks[r.name].currentLoss]) },
        { id: 's_bakker', icon: '🥯', label: 'De Bakker (6-0 Uitgedeeld)', check: () => sortedByBagelG[0].val > 0 ? `${sortedByBagelG[0].name} (${sortedByBagelG[0].val}x)` : null, headers: ['#', 'Speler', 'Uitgedeeld (x)', ''], getRows: () => sortedByBagelG.filter(r=>r.val>0).map((r, i) => [i+1, r.name, r.val, '-']) },
        { id: 's_bagel', icon: '🍩', label: 'Bagel Eter (0-6 Gekregen)', check: () => sortedByBagelE[0].val > 0 ? `${sortedByBagelE[0].name} (${sortedByBagelE[0].val}x)` : null, headers: ['#', 'Speler', 'Opgegeten (x)', ''], getRows: () => sortedByBagelE.filter(r=>r.val>0).map((r, i) => [i+1, r.name, r.val, '-']) },
        { id: 's_thrill', icon: '🎢', label: 'Spanningszoeker (6-5 Winst)', check: () => sortedByThrillsW[0].val > 0 ? `${sortedByThrillsW[0].name} (${sortedByThrillsW[0].val}x)` : null, headers: ['#', 'Speler', 'Zweetwinst (x)', ''], getRows: () => sortedByThrillsW.filter(r=>r.val>0).map((r, i) => [i+1, r.name, r.val, '-']) },
        { id: 's_netniet', icon: '💔', label: 'Net Niet (5-6 Verlies)', check: () => sortedByThrillsL[0].val > 0 ? `${sortedByThrillsL[0].name} (${sortedByThrillsL[0].val}x)` : null, headers: ['#', 'Speler', 'Zweetverlies (x)', ''], getRows: () => sortedByThrillsL.filter(r=>r.val>0).map((r, i) => [i+1, r.name, r.val, '-']) }
    ];

    const duoAwards = [
        { id: 'd_goud', icon: '🤝', label: 'Gouden Duo (Winst)', check: () => sortedByDuoWins[0].wins > 0 ? `${sortedByDuoWins[0].duo} (${sortedByDuoWins[0].wins}w)` : null, headers: ['#', 'Duo', 'Winst', 'Matches'], getRows: () => sortedByDuoWins.filter(r=>r.wins>0).map((r, i) => [i+1, r.duo, r.wins, r.games]) },
        { id: 'd_drama', icon: '🗑️', label: 'Dramatisch Duo (Verlies)', check: () => sortedByDuoLosses[0].losses > 0 ? `${sortedByDuoLosses[0].duo} (${sortedByDuoLosses[0].losses}v)` : null, headers: ['#', 'Duo', 'Verlies', 'Matches'], getRows: () => sortedByDuoLosses.filter(r=>r.losses>0).map((r, i) => [i+1, r.duo, r.losses, r.games]) },
        { id: 'd_syn', icon: '🧠', label: 'Synergie (Win %, min 2m)', check: () => sortedByDuoPerc.length > 0 && sortedByDuoPerc[0].wins > 0 ? `${sortedByDuoPerc[0].duo} (${sortedByDuoPerc[0].perc}%)` : null, headers: ['#', 'Duo', 'Win %', 'W-V'], getRows: () => sortedByDuoPerc.filter(r=>r.wins>0).map((r, i) => [i+1, r.duo, r.perc+'%', `${r.wins}-${r.losses}`]) },
        { id: 'd_dyna', icon: '💣', label: 'Dynamiet (Beste Saldo)', check: () => sortedByDuoSaldo.length > 0 && (sortedByDuoSaldo[0].gamesWon - sortedByDuoSaldo[0].gamesLost) > 0 ? `${sortedByDuoSaldo[0].duo} (+${sortedByDuoSaldo[0].gamesWon - sortedByDuoSaldo[0].gamesLost})` : null, headers: ['#', 'Duo', 'Saldo', 'W-V'], getRows: () => sortedByDuoSaldo.filter(r=>(r.gamesWon-r.gamesLost)>0).map((r, i) => [i+1, r.duo, '+'+(r.gamesWon-r.gamesLost), `${r.wins}-${r.losses}`]) },
        { id: 'd_bunker', icon: '🛡️', label: 'De Bunkers (Min. Tegen, min 2m)', check: () => sortedByDuoMuur.length > 0 ? `${sortedByDuoMuur[0].duo} (${(sortedByDuoMuur[0].gamesLost/sortedByDuoMuur[0].games).toFixed(1)})` : null, headers: ['#', 'Duo', 'Gem. Tegen', 'Matches'], getRows: () => sortedByDuoMuur.map((r, i) => [i+1, r.duo, (r.gamesLost/r.games).toFixed(2), r.games]) },
        { id: 'd_glad', icon: '⚔️', label: 'Gladiatoren (Langste matchen)', check: () => sortedByDuoLangeMatch.length > 0 ? `${sortedByDuoLangeMatch[0].duo} (${sortedByDuoLangeMatch[0].avgGames}g)` : null, headers: ['#', 'Duo', 'Gem. Games/Match', 'Matches'], getRows: () => sortedByDuoLangeMatch.map((r, i) => [i+1, r.duo, r.avgGames, r.games]) },
        { id: 'd_sprint', icon: '💨', label: 'Sprinters (Kortste matchen)', check: () => sortedByDuoKorteMatch.length > 0 ? `${sortedByDuoKorteMatch[0].duo} (${sortedByDuoKorteMatch[0].avgGames}g)` : null, headers: ['#', 'Duo', 'Gem. Games/Match', 'Matches'], getRows: () => sortedByDuoKorteMatch.map((r, i) => [i+1, r.duo, r.avgGames, r.games]) },
        { id: 'd_slager', icon: '🔪', label: 'De Slagers (6-0 Winst)', check: () => sortedByDuoBagelsG[0].bagelsG > 0 ? `${sortedByDuoBagelsG[0].duo} (${sortedByDuoBagelsG[0].bagelsG}x)` : null, headers: ['#', 'Duo', 'Uitgedeeld (x)', ''], getRows: () => sortedByDuoBagelsG.filter(r=>r.bagelsG>0).map((r, i) => [i+1, r.duo, r.bagelsG, '-']) },
        { id: 'd_sukkel', icon: '😭', label: 'Sukkelaars (0-6 Verlies)', check: () => sortedByDuoBagelsE[0].bagelsE > 0 ? `${sortedByDuoBagelsE[0].duo} (${sortedByDuoBagelsE[0].bagelsE}x)` : null, headers: ['#', 'Duo', 'Opgegeten (x)', ''], getRows: () => sortedByDuoBagelsE.filter(r=>r.bagelsE>0).map((r, i) => [i+1, r.duo, r.bagelsE, '-']) },
        { id: 'd_hart', icon: '🚑', label: 'Hartaanval (6-5 Winst)', check: () => sortedByDuoThrillsW[0].thrillsW > 0 ? `${sortedByDuoThrillsW[0].duo} (${sortedByDuoThrillsW[0].thrillsW}x)` : null, headers: ['#', 'Duo', 'Zweetwinst (x)', ''], getRows: () => sortedByDuoThrillsW.filter(r=>r.thrillsW>0).map((r, i) => [i+1, r.duo, r.thrillsW, '-']) },
        { id: 'd_trag', icon: '🎻', label: 'Tragisch Duo (5-6 Verlies)', check: () => sortedByDuoThrillsL[0].thrillsL > 0 ? `${sortedByDuoThrillsL[0].duo} (${sortedByDuoThrillsL[0].thrillsL}x)` : null, headers: ['#', 'Duo', 'Zweetverlies (x)', ''], getRows: () => sortedByDuoThrillsL.filter(r=>r.thrillsL>0).map((r, i) => [i+1, r.duo, r.thrillsL, '-']) }
    ];

    window.hofData = {};
    
    const renderAwards = (awardArray, containerId) => {
        let html = '';
        awardArray.forEach(a => {
            const val = a.check();
            const isLocked = !val;
            const displayVal = isLocked ? 'NOG NIET BEHAALD' : val;
            const lockedClass = isLocked ? 'locked-stat' : '';
            const onClickAction = isLocked ? '' : `onclick="openHofModal('${a.id}')"`;

            if(!isLocked) window.hofData[a.id] = { title: a.label, headers: a.headers, rows: a.getRows() };

            html += `
                <div class="stat-card ${lockedClass}" ${onClickAction} style="cursor: ${isLocked ? 'default' : 'pointer'};">
                    <div class="stat-icon">${a.icon}</div>
                    <div class="stat-info">
                        <span class="stat-label">${a.label}</span>
                        <span class="stat-value" style="font-size: ${isLocked ? 'clamp(11px, 3vw, 13px)' : 'clamp(15px, 4vw, 18px)'}; color: ${isLocked ? 'var(--text-muted)' : 'white'};">${displayVal}</span>
                    </div>
                </div>
            `;
        });
        const container = document.getElementById(containerId);
        if(container) container.innerHTML = html;
    };

    renderAwards(soloAwards, 'stats-grid-solo');
    renderAwards(duoAwards, 'stats-grid-duo');
}

// 6. HALL OF FAME MODAL LOGICA
function openHofModal(id) {
    const data = window.hofData[id];
    if(!data) return;

    document.getElementById('hof-modal-title').innerText = data.title;
    
    let headHTML = '';
    data.headers.forEach(h => headHTML += `<th>${h}</th>`);
    document.getElementById('hof-modal-head').innerHTML = headHTML;

    let bodyHTML = '';
    data.rows.forEach((row, rowIdx) => {
        let rankClass = rowIdx === 0 ? 'rank-1' : (rowIdx === 1 ? 'rank-2' : (rowIdx === 2 ? 'rank-3' : ''));
        bodyHTML += `<tr class="${rankClass}">`;
        row.forEach((cell, idx) => {
            if(idx === 1) bodyHTML += `<td><strong>${cell}</strong></td>`;
            else bodyHTML += `<td>${cell}</td>`;
        });
        bodyHTML += `</tr>`;
    });
    document.getElementById('hof-modal-body').innerHTML = bodyHTML;
    document.getElementById('hof-modal').classList.add('active');
}

function closeHofModal() {
    document.getElementById('hof-modal').classList.remove('active');
}

// 7. BEWERK / UPDATE SYSTEEM SCORES
function selectScore(team, value) {
    if (team === 't1') selectedScoreT1 = value;
    if (team === 't2') selectedScoreT2 = value;

    const bubbles = document.querySelectorAll(`#bubbles-${team} .score-bubble`);
    bubbles.forEach(b => b.classList.remove('selected'));
    
    bubbles[value].classList.add('selected');
}

function openModal(id, t1, t2, sc1, sc2) {
    currentEditMatchId = id;
    document.getElementById('modal-match-id').innerText = `#${id}`;
    document.getElementById('modal-t1-names').innerText = t1;
    document.getElementById('modal-t2-names').innerText = t2;
    
    document.querySelectorAll('.score-bubble').forEach(b => b.classList.remove('selected'));
    selectedScoreT1 = null;
    selectedScoreT2 = null;
    
    if (sc1 !== null) selectScore('t1', sc1);
    if (sc2 !== null) selectScore('t2', sc2);
    
    document.getElementById('score-modal').classList.add('active');
}

function clearScore() {
    selectedScoreT1 = null;
    selectedScoreT2 = null;
    document.querySelectorAll('.score-bubble').forEach(b => b.classList.remove('selected'));
}

function closeModal() {
    document.getElementById('score-modal').classList.remove('active');
}

async function saveScore() {
    let updateData = {};
    if (selectedScoreT1 === null || selectedScoreT2 === null) {
        updateData = { score_t1: null, score_t2: null, tussenstand_t1: null, tussenstand_t2: null };
    } else {
        updateData = { score_t1: selectedScoreT1, score_t2: selectedScoreT2, tussenstand_t1: null, tussenstand_t2: null };
    }

    const { error } = await db.from('matches').update(updateData).eq('id', currentEditMatchId);
    if (!error) {
        closeModal(); 
        if (typeof init === "function") init(); 
        if (typeof renderCalendar === "function") {
            const { data: mData } = await db.from('matches').select('*').order('id', { ascending: true });
            renderCalendar(mData);
        }
    } else {
        alert("Fout bij opslaan: " + error.message);
    }
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('nl-BE', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
}

init();
