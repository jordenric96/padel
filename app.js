// 1. KOPPEL SUPABASE
const SUPABASE_URL = 'https://rwtqrxaabkcueuboqbju.supabase.co';
const SUPABASE_KEY = 'sb_publishable_hu5zlS1aivNht1gzRgbuww_WIbCr2eL'; 

const { createClient } = window.supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

let currentEditMatchId = null;
let selectedScoreT1 = null;
let selectedScoreT2 = null;

// Start applicatie
async function init() {
    const { data: matches, error } = await db.from('matches').select('*').order('id', { ascending: true });
    
    if (error) {
        console.error("Fout bij laden database:", error);
        return;
    }
    
    buildDashboard(matches);
}

// GUI: Inklapsysteem (Accordeon)
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

// 2. BOUW HET DASHBOARD
function buildDashboard(matches) {
    const playedMatches = matches.filter(m => m.score_t1 !== null && m.score_t2 !== null);
    
    const nextMatchRow = matches.find(m => m.score_t1 === null);
    const currentWeek = nextMatchRow ? nextMatchRow.week : 30;
    
    document.getElementById('status-text').innerText = `Status voor aanvang van Week ${currentWeek}`;

    renderMatchdayWidgets(matches, currentWeek);
    calculateAndRenderLeaderboards(matches, playedMatches);
}

// 3. WIDGETS RENDERING
function renderMatchdayWidgets(matches, currentWeek) {
    const pastWeek = currentWeek > 1 ? currentWeek - 1 : 1;
    const pastMatches = matches.filter(m => m.week === pastWeek);
    
    let pastHTML = `
        <div class="matchday-header">
            <h2>⏪ W${pastWeek} MATCHES</h2>
            <span class="matchday-date">${formatDate(pastMatches[0].match_date)}</span>
        </div>
        <div class="matchday-content">
            <p class="rust-info">RUST: <span class="badge-rest">${pastMatches[0].rest_1} & ${pastMatches[0].rest_2}</span></p>
    `;
    pastMatches.forEach(m => pastHTML += buildMatchRow(m));
    pastHTML += `</div>`;
    document.getElementById('past-match-widget').innerHTML = pastHTML;

    const nextWeekMatches = matches.filter(m => m.week === currentWeek);
    if(nextWeekMatches.length > 0) {
        let nextHTML = `
            <div class="matchday-header">
                <h2>⏭️ W${currentWeek} MATCHES</h2>
                <span class="matchday-date">${formatDate(nextWeekMatches[0].match_date)}</span>
            </div>
            <div class="matchday-content">
                <p class="rust-info">RUST: <span class="badge-rest">${nextWeekMatches[0].rest_1} & ${nextWeekMatches[0].rest_2}</span></p>
        `;
        nextWeekMatches.forEach(m => nextHTML += buildMatchRow(m));
        nextHTML += `</div>`;
        document.getElementById('next-match-widget').innerHTML = nextHTML;
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
        </div>
    `;
}

// 4. STATISTIEKEN BEREKENEN & HALL OF FAME
function calculateAndRenderLeaderboards(allMatches, playedMatches) {
    const players = ['Jorden', 'Yarni', 'Lars', 'Vince', 'Kristof', 'Sammy'];
    let stats = {};
    let playerStreaks = {};
    let bagelKings = new Set();
    let bagelEaters = new Set();
    let thrillSeekers = new Set();
    
    players.forEach(p => {
        stats[p] = { games: 0, wins: 0, losses: 0, gamesWon: 0, gamesLost: 0 };
        playerStreaks[p] = { currentWin: 0, maxWin: 0, currentLoss: 0, maxLoss: 0 };
    });

    let duoStats = {};

    playedMatches.forEach(m => {
        const t1 = [m.t1_p1, m.t1_p2].sort();
        const t2 = [m.t2_p1, m.t2_p2].sort();
        const d1 = t1.join(' & ');
        const d2 = t2.join(' & ');
        
        if (!duoStats[d1]) duoStats[d1] = { wins: 0, losses: 0 };
        if (!duoStats[d2]) duoStats[d2] = { wins: 0, losses: 0 };

        const t1Wins = m.score_t1 > m.score_t2;

        t1.forEach(p => {
            stats[p].games++;
            stats[p].gamesWon += m.score_t1;
            stats[p].gamesLost += m.score_t2;
            if (t1Wins) {
                stats[p].wins++;
                playerStreaks[p].currentWin++; playerStreaks[p].currentLoss = 0;
                if(playerStreaks[p].currentWin > playerStreaks[p].maxWin) playerStreaks[p].maxWin = playerStreaks[p].currentWin;
            } else {
                stats[p].losses++;
                playerStreaks[p].currentLoss++; playerStreaks[p].currentWin = 0;
                if(playerStreaks[p].currentLoss > playerStreaks[p].maxLoss) playerStreaks[p].maxLoss = playerStreaks[p].currentLoss;
            }
        });

        t2.forEach(p => {
            stats[p].games++;
            stats[p].gamesWon += m.score_t2;
            stats[p].gamesLost += m.score_t1;
            if (!t1Wins) {
                stats[p].wins++;
                playerStreaks[p].currentWin++; playerStreaks[p].currentLoss = 0;
                if(playerStreaks[p].currentWin > playerStreaks[p].maxWin) playerStreaks[p].maxWin = playerStreaks[p].currentWin;
            } else {
                stats[p].losses++;
                playerStreaks[p].currentLoss++; playerStreaks[p].currentWin = 0;
                if(playerStreaks[p].currentLoss > playerStreaks[p].maxLoss) playerStreaks[p].maxLoss = playerStreaks[p].currentLoss;
            }
        });

        if (t1Wins) { duoStats[d1].wins++; duoStats[d2].losses++; } 
        else { duoStats[d2].wins++; duoStats[d1].losses++; }

        if (m.score_t1 === 6 && m.score_t2 === 0) { t1.forEach(p => bagelKings.add(p)); t2.forEach(p => bagelEaters.add(p)); }
        if (m.score_t2 === 6 && m.score_t1 === 0) { t2.forEach(p => bagelKings.add(p)); t1.forEach(p => bagelEaters.add(p)); }
        if ((m.score_t1 === 6 && m.score_t2 === 5) || (m.score_t1 === 5 && m.score_t2 === 6)) {
            if (t1Wins) t1.forEach(p => thrillSeekers.add(p)); else t2.forEach(p => thrillSeekers.add(p));
        }
    });

    const ranking = Object.keys(stats).map(p => ({
        name: p,
        ...stats[p],
        saldo: stats[p].gamesWon - stats[p].gamesLost
    })).sort((a, b) => b.wins - a.wins || b.saldo - a.saldo);

    // Individueel Klassement HTML
    let indHTML = '';
    ranking.forEach((r, idx) => {
        const sign = r.saldo > 0 ? '+' : '';
        const saldoClass = r.saldo > 0 ? 'positive' : (r.saldo < 0 ? 'negative' : 'neutral');
        indHTML += `
            <tr class="rank-${idx+1}">
                <td>${idx+1}</td>
                <td><strong>${r.name}</strong></td>
                <td>${r.games}</td><td>${r.wins}</td><td>${r.losses}</td>
                <td class="${saldoClass}">${sign}${r.saldo} (${r.gamesWon}-${r.gamesLost})</td>
            </tr>
        `;
    });
    document.getElementById('individual-leaderboard').innerHTML = indHTML;

    // Volledig Duo Klassement HTML (Geen slice meer)
    const duoRanking = Object.keys(duoStats).map(d => {
        const total = duoStats[d].wins + duoStats[d].losses;
        return {
            duo: d, w: duoStats[d].wins, l: duoStats[d].losses,
            perc: total === 0 ? 0 : Math.round((duoStats[d].wins / total) * 100)
        };
    }).sort((a, b) => b.perc - a.perc || b.w - a.w);

    let duoHTML = '';
    duoRanking.forEach((r, idx) => {
        const pClass = r.perc > 50 ? 'positive' : (r.perc === 0 ? 'neutral' : 'negative');
        duoHTML += `<tr class="rank-${idx+1}"><td>${idx+1}</td><td><strong>${r.duo}</strong></td><td>${r.w} - ${r.l}</td><td class="${pClass}">${r.perc}%</td></tr>`;
    });
    document.getElementById('duo-leaderboard').innerHTML = duoHTML;

    let bestWinStreak = 0; let bestWinStreakPlayers = [];
    let worstLossStreak = 0; let worstLossStreakPlayers = [];
    
    players.forEach(p => {
        if(playerStreaks[p].maxWin > bestWinStreak) { bestWinStreak = playerStreaks[p].maxWin; bestWinStreakPlayers = [p]; } 
        else if (playerStreaks[p].maxWin === bestWinStreak && bestWinStreak > 0) { bestWinStreakPlayers.push(p); }

        if(playerStreaks[p].maxLoss > worstLossStreak) { worstLossStreak = playerStreaks[p].maxLoss; worstLossStreakPlayers = [p]; } 
        else if (playerStreaks[p].maxLoss === worstLossStreak && worstLossStreak > 0) { worstLossStreakPlayers.push(p); }
    });

    const hasPlayed = ranking[0].games > 0;
    
    // Awards lijst zonder Flawless en Eerste Bloed
    const awards = [
        { icon: '👑', label: 'De Koning (Huidige Leider)', check: () => hasPlayed ? ranking[0].name : null },
        { icon: '🦈', label: 'De Haai (Beste Saldo)', check: () => hasPlayed ? `${ranking[0].name} (+${ranking[0].saldo})` : null },
        { icon: '🧱', label: 'De Muur (Minste Tegengoals)', check: () => {
            if(!hasPlayed) return null;
            const muur = [...ranking].filter(r=>r.games > 0).sort((a,b) => (a.gamesLost/a.games) - (b.gamesLost/b.games))[0];
            return `${muur.name} (${(muur.gamesLost/muur.games).toFixed(1)}/g)`;
        }},
        { icon: '🎯', label: 'Schietschijf (Meeste Tegen)', check: () => {
            if(!hasPlayed) return null;
            const schietschijf = [...ranking].filter(r=>r.games > 0).sort((a,b) => b.gamesLost - a.gamesLost)[0];
            return `${schietschijf.name} (${schietschijf.gamesLost})`;
        }},
        { icon: '🔥', label: 'On Fire (Win Streak)', check: () => bestWinStreak >= 2 ? `${bestWinStreakPlayers.join(', ')} (${bestWinStreak})` : null },
        { icon: '🧊', label: 'Pechvogel (Verlies Streak)', check: () => worstLossStreak >= 2 ? `${worstLossStreakPlayers.join(', ')} (${worstLossStreak})` : null },
        { icon: '🥯', label: 'De Bakker (6-0 Winst)', check: () => bagelKings.size > 0 ? Array.from(bagelKings).join(', ') : null },
        { icon: '🍩', label: 'Bagel Eter (6-0 Verlies)', check: () => bagelEaters.size > 0 ? Array.from(bagelEaters).join(', ') : null },
        { icon: '🎢', label: 'Spanningszoeker (6-5 Winst)', check: () => thrillSeekers.size > 0 ? Array.from(thrillSeekers).join(', ') : null },
        { icon: '🤝', label: 'Gouden Duo (Meeste Winst)', check: () => {
            if(!hasPlayed) return null;
            const bestDuo = Object.keys(duoStats).filter(d => duoStats[d].wins > 0).sort((a,b) => duoStats[b].wins - duoStats[a].wins)[0];
            return bestDuo ? `${bestDuo} (${duoStats[bestDuo].wins}w)` : null;
        }}
    ];

    let statsHTML = '';
    awards.forEach(a => {
        const val = a.check();
        const isLocked = !val;
        const displayVal = isLocked ? 'NOG NIET BEHAALD' : val;
        const lockedClass = isLocked ? 'locked-stat' : '';
        
        statsHTML += `
            <div class="stat-card ${lockedClass}">
                <div class="stat-icon">${a.icon}</div>
                <div class="stat-info">
                    <span class="stat-label">${a.label}</span>
                    <span class="stat-value" style="font-size: ${isLocked ? 'clamp(12px, 3vw, 14px)' : 'clamp(18px, 5vw, 22px)'}; color: ${isLocked ? 'var(--text-muted)' : 'white'};">${displayVal}</span>
                </div>
            </div>
        `;
    });
    document.getElementById('stats-grid-container').innerHTML = statsHTML;
}

// 5. BEWERK / UPDATE SYSTEEM MET BOLLETJES
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
        init(); 
    } else {
        alert("Fout bij opslaan: " + error.message);
    }
}

function formatDate(dateString) {
    const d = new Date(dateString);
    return d.toLocaleDateString('nl-BE', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
}

init();
