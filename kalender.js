const SUPABASE_URL = 'https://rwtqrxaabkcueuboqbju.supabase.co';
const SUPABASE_KEY = 'sb_publishable_hu5zlS1aivNht1gzRgbuww_WIbCr2eL'; 

const { createClient } = window.supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

let currentEditMatchId = null;
let selectedScoreT1 = null;
let selectedScoreT2 = null;

async function init() {
    const { data: matches, error } = await db.from('matches').select('*').order('id', { ascending: true });
    if (error) { console.error("Fout bij laden:", error); return; }
    renderCalendar(matches);
}

function renderCalendar(matches) {
    const container = document.getElementById('calendar-container');
    let html = '';
    const weeks = {};
    matches.forEach(m => { if (!weeks[m.week]) weeks[m.week] = []; weeks[m.week].push(m); });

    const nextMatchRow = matches.find(m => m.score_t1 === null);
    const currentWeekToScroll = nextMatchRow ? nextMatchRow.week : 30;

    for (let w = 1; w <= 30; w++) {
        if (!weeks[w]) continue;
        const weekMatches = weeks[w];
        const dateStr = formatDate(weekMatches[0].match_date);
        const rest1 = weekMatches[0].rest_1;
        const rest2 = weekMatches[0].rest_2;

        let matchesHtml = '';
        weekMatches.forEach((m, idx) => {
            const isPlayed = m.score_t1 !== null;
            let scoreDisplay = `<span class="vs">VS</span>`;
            if (isPlayed) {
                const t1Wins = m.score_t1 > m.score_t2;
                scoreDisplay = `<span class="score ${t1Wins ? 'win-score' : 'lose-score'}">${m.score_t1} - ${m.score_t2}</span>`;
            }

            matchesHtml += `
                <div class="match-row">
                    <span class="match-num">M${idx+1}</span>
                    <div class="match-teams">
                        <span class="team ${isPlayed && m.score_t1 > m.score_t2 ? 'win' : ''}">${m.t1_p1} & ${m.t1_p2}</span>
                        ${scoreDisplay}
                        <span class="team ${isPlayed && m.score_t2 > m.score_t1 ? 'win' : ''}">${m.t2_p1} & ${m.t2_p2}</span>
                    </div>
                    <button class="edit-btn" style="margin-left:8px;" onclick="openModal(${m.id}, '${m.t1_p1} & ${m.t1_p2}', '${m.t2_p1} & ${m.t2_p2}', ${m.score_t1}, ${m.score_t2})">✎</button>
                </div>
            `;
        });

        html += `
            <div class="calendar-card" id="week-${w}">
                <div class="card-header">
                    <span class="week-title">Week ${w}</span>
                    <span class="week-date">${dateStr}</span>
                </div>
                <div class="card-body">
                    <div class="rest-box">
                        <span class="rest-label">Rust:</span>
                        <span class="badge-rest">${rest1} & ${rest2}</span>
                    </div>
                    <div class="matches-box">${matchesHtml}</div>
                </div>
            </div>
        `;
    }

    container.innerHTML = html;

    setTimeout(() => {
        const weekCard = document.getElementById(`week-${currentWeekToScroll}`);
        if (weekCard) {
            const yOffset = -80; 
            const y = weekCard.getBoundingClientRect().top + window.scrollY + yOffset;
            window.scrollTo({top: y, behavior: 'smooth'});
        }
    }, 400);
}

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
    selectedScoreT1 = null; selectedScoreT2 = null;
    if (sc1 !== null) selectScore('t1', sc1);
    if (sc2 !== null) selectScore('t2', sc2);
    document.getElementById('score-modal').classList.add('active');
}

function clearScore() {
    selectedScoreT1 = null; selectedScoreT2 = null;
    document.querySelectorAll('.score-bubble').forEach(b => b.classList.remove('selected'));
}

function closeModal() { document.getElementById('score-modal').classList.remove('active'); }

async function saveScore() {
    let updateData = {};
    if (selectedScoreT1 === null || selectedScoreT2 === null) {
        updateData = { score_t1: null, score_t2: null, tussenstand_t1: null, tussenstand_t2: null };
    } else {
        updateData = { score_t1: selectedScoreT1, score_t2: selectedScoreT2, tussenstand_t1: null, tussenstand_t2: null };
    }

    const { error } = await db.from('matches').update(updateData).eq('id', currentEditMatchId);
    if (!error) { closeModal(); init(); } else { alert("Fout bij opslaan: " + error.message); }
}

function formatDate(dateString) { return new Date(dateString).toLocaleDateString('nl-BE', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase(); }

init();
