// 1. KOPPEL SUPABASE
const SUPABASE_URL = 'https://rwtqrxaabkcueuboqbju.supabase.co';
const SUPABASE_KEY = 'PLAK_HIER_JOUW_PUBLISHABLE_API_KEY_UIT_JE_SCREENSHOT'; 

const { createClient } = window.supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

let currentEditMatchId = null;

// Start applicatie
async function init() {
    const { data: matches, error } = await db.from('matches').select('*').order('id', { ascending: true });
    
    if (error) {
        console.error("Fout bij laden database:", error);
        return;
    }
    
    buildDashboard(matches);
}

// 2. BOUW HET DASHBOARD
function buildDashboard(matches) {
    const playedMatches = matches.filter(m => m.score_t1 !== null && m.score_t2 !== null);
    
    const nextMatchRow = matches.find(m => m.score_t1 === null);
    const currentWeek = nextMatchRow ? nextMatchRow.week : 30;
    
    document.getElementById('status-text').innerText = `Status voor aanvang van Week ${currentWeek}`;

    renderMatchdayWidgets(matches, currentWeek);
    calculateAndRenderLeaderboards(playedMatches);
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

// 4. STATISTIEKEN BEREKENEN
function calculateAndRenderLeaderboards(matches) {
    const players = ['Jorden', 'Yarni', 'Lars', 'Vince', 'Kristof', 'Sammy'];
    let stats = {};
    players.forEach(p => stats[p] = { games: 0, wins: 0, losses: 0, gamesWon: 0, gamesLost: 0 });

    let duoStats = {};

    matches.forEach(m => {
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
            if (t1Wins) stats[p].wins++; else stats[p].losses++;
        });

        t2.forEach(p => {
            stats[p].games++;
            stats[p].gamesWon += m.score_t2;
            stats[p].gamesLost += m.score_t1;
            if (!t1Wins) stats[p].wins++; else stats[p].losses++;
        });

        if (t1Wins) { duoStats[d1].wins++; duoStats[d2].losses++; } 
        else { duoStats[d2].wins++; duoStats[d1].losses++; }
    });

    const ranking = Object.keys(stats).map(p => ({
        name: p,
        ...stats[p],
        saldo: stats[p].gamesWon - stats[p].gamesLost
    })).sort((a, b) => b.wins - a.wins || b.saldo - a.saldo);

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

    const duoRanking = Object.keys(duoStats).map(d => {
        const total = duoStats[d].wins + duoStats[d].losses;
        return {
            duo: d,
            w: duoStats[d].wins,
            l: duoStats[d].losses,
            perc: total === 0 ? 0 : Math.round((duoStats[d].wins / total) * 100)
        };
    }).sort((a, b) => b.perc - a.perc || b.w - a.w).slice(0,5);

    let duoHTML = '';
    duoRanking.forEach((r, idx) => {
        const pClass = r.perc > 50 ? 'positive' : (r.perc === 0 ? 'neutral' : 'negative');
        duoHTML += `<tr class="rank-${idx+1}"><td>${idx+1}</td><td><strong>${r.duo}</strong></td><td>${r.w} - ${r.l}</td><td class="${pClass}">${r.perc}%</td></tr>`;
    });
    document.getElementById('duo-leaderboard').innerHTML = duoHTML;

    if(ranking[0].games > 0) {
        document.getElementById('stats-grid-container').innerHTML = `
            <div class="stat-card"><div class="stat-icon">👑</div><div class="stat-info"><span class="stat-label">Huidige Leider</span><span class="stat-value">${ranking[0].name}</span></div></div>
            <div class="stat-card"><div class="stat-icon">🦈</div><div class="stat-info"><span class="stat-label">Beste Saldo</span><span class="stat-value">${ranking[0].name} (+${ranking[0].saldo})</span></div></div>
            <div class="stat-card"><div class="stat-icon">🧱</div><div class="stat-info"><span class="stat-label">Meeste Tegengoals</span><span class="stat-value">${[...ranking].sort((a,b)=>b.gamesLost - a.gamesLost)[0].name}</span></div></div>
        `;
    } else {
        document.getElementById('stats-grid-container').innerHTML = `<p style="color:var(--text-muted);">Speel eerst een match om de Hall of Fame te vullen!</p>`;
    }
}

// 5. BEWERK / UPDATE SYSTEEM
function openModal(id, t1, t2, sc1, sc2) {
    currentEditMatchId = id;
    document.getElementById('modal-match-id').innerText = `#${id}`;
    document.getElementById('modal-t1-names').innerText = t1;
    document.getElementById('modal-t2-names').innerText = t2;
    
    document.getElementById('input-t1').value = sc1 !== null ? sc1 : '';
    document.getElementById('input-t2').value = sc2 !== null ? sc2 : '';
    
    document.getElementById('score-modal').classList.add('active');
}

function closeModal() {
    document.getElementById('score-modal').classList.remove('active');
}

async function saveScore() {
    const s1 = document.getElementById('input-t1').value;
    const s2 = document.getElementById('input-t2').value;
    
    let updateData = {};
    
    // Als de velden leeg worden gemaakt, resetten we de score
    if (s1 === '' || s2 === '') {
        updateData = { score_t1: null, score_t2: null, tussenstand_t1: null, tussenstand_t2: null };
    } else {
        updateData = { score_t1: parseInt(s1), score_t2: parseInt(s2), tussenstand_t1: null, tussenstand_t2: null };
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
