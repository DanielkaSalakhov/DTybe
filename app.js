let notes = JSON.parse(localStorage.getItem('focus_notes') || '[]');
let apiKey = localStorage.getItem('youtube_api_key') || '';
let timerSeconds = 25 * 60;
let timerInterval = null;
let isTimerRunning = false;

const playerIframe = document.getElementById('main-player');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const searchResults = document.getElementById('search-results');
const timerDisplay = document.getElementById('timer-display');
const timerBtn = document.getElementById('timer-btn');
const noteInput = document.getElementById('note-input');
const addNoteBtn = document.getElementById('add-note-btn');
const notesContainer = document.getElementById('notes-container');

const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeSettings = document.getElementById('close-settings');
const apiKeyInput = document.getElementById('api-key-input');
const saveSettingsBtn = document.getElementById('save-settings-btn');

document.addEventListener('DOMContentLoaded', () => {
    renderNotes();
    if (apiKey) apiKeyInput.value = apiKey;
});

settingsBtn.addEventListener('click', () => settingsModal.classList.remove('hidden'));
closeSettings.addEventListener('click', () => settingsModal.classList.add('hidden'));
saveSettingsBtn.addEventListener('click', () => {
    apiKey = apiKeyInput.value.trim();
    localStorage.setItem('youtube_api_key', apiKey);
    settingsModal.classList.add('hidden');
    alert('Ключ успешно сохранен локально!');
});

async function performSearch() {
    const query = searchInput.value.trim();
    if (!query) return;

    if (!apiKey) {
        alert('Пожалуйста, добавьте ваш YouTube API Key в настройках (иконка ⚙️ вверху)!');
        settingsModal.classList.remove('hidden');
        return;
    }

    searchResults.innerHTML = `<p class="text-indigo-400 text-sm col-span-2 animate-pulse px-2">Ищем видео на тему "${query}"...</p>`;

    try {
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=16&q=${encodeURIComponent(query)}&type=video&key=${apiKey}`;
        
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            throw new Error(data.error.message);
        }

        searchResults.innerHTML = ''; 

        if (!data.items || data.items.length === 0) {
            searchResults.innerHTML = `<p class="text-rose-400 text-sm col-span-2 px-2">Ничего не найдено. Попробуйте уточнить запрос.</p>`;
            return;
        }

        data.items.forEach(item => {
            const videoId = item.id.videoId;
            const snippet = item.snippet;
            
            const card = document.createElement('div');
            card.className = 'bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-indigo-500/50 transition cursor-pointer flex flex-col justify-between group';
            
            card.innerHTML = `
                <div class="overflow-hidden aspect-video">
                    <img src="${snippet.thumbnails.high?.url || snippet.thumbnails.medium?.url}" class="w-full h-full object-cover group-hover:scale-105 transition duration-300" alt="Preview">
                </div>
                <div class="p-3">
                    <h4 class="text-sm font-medium text-slate-200 line-clamp-2">${snippet.title}</h4>
                    <p class="text-xs text-slate-400 mt-1">${snippet.channelTitle}</p>
                </div>
            `;

            card.addEventListener('click', () => {
                selectVideo(videoId);
            });

            searchResults.appendChild(card);
        });

    } catch (error) {
        console.error("Ошибка YouTube API:", error);
        searchResults.innerHTML = `
            <div class="text-rose-400 text-sm col-span-2 px-2">
                <p>⚠️ Ошибка поиска.</p>
                <p class="text-xs text-slate-500 mt-1">Причина: ${error.message || 'Проверьте правильность API ключа'}</p>
            </div>
        `;
    }
}

function selectVideo(videoId) {
    playerIframe.src = `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&autoplay=1`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

searchBtn.addEventListener('click', performSearch);
searchInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') performSearch(); });


function addNote() {
    const text = noteInput.value.trim();
    if (!text) return;

    const newNote = {
        id: Date.now(),
        time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        text: text
    };

    notes.unshift(newNote);
    localStorage.setItem('focus_notes', JSON.stringify(notes));
    noteInput.value = '';
    renderNotes();
}

function deleteNote(id) {
    notes = notes.filter(note => note.id !== id);
    localStorage.setItem('focus_notes', JSON.stringify(notes));
    renderNotes();
}

function renderNotes() {
    notesContainer.innerHTML = '';
    if (notes.length === 0) {
        notesContainer.innerHTML = `<p class="text-center text-sm text-slate-500 mt-8">Заметок пока нет. Они сохраняются в вашем браузере.</p>`;
        return;
    }

    notes.forEach(note => {
        const noteEl = document.createElement('div');
        noteEl.className = 'bg-slate-800/40 border border-slate-800/80 rounded-xl p-3 text-sm hover:border-slate-700 transition group';
        noteEl.innerHTML = `
            <div class="flex justify-between items-start">
                <span class="text-indigo-400 font-mono font-bold bg-indigo-950/50 px-2 py-0.5 rounded border border-indigo-900/50">
                    ${note.time}
                </span>
                <button class="delete-btn text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition cursor-pointer" data-id="${note.id}">
                    ✕
                </button>
            </div>
            <p class="mt-1.5 text-slate-300 leading-relaxed">${note.text}</p>
        `;
        noteEl.querySelector('.delete-btn').addEventListener('click', () => deleteNote(note.id));
        notesContainer.appendChild(noteEl);
    });
}

addNoteBtn.addEventListener('click', addNote);
noteInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') addNote(); });

function toggleTimer() {
    if (isTimerRunning) {
        clearInterval(timerInterval);
        timerBtn.textContent = 'Старт фокуса';
        timerBtn.classList.replace('bg-rose-600', 'bg-slate-700');
    } else {
        timerBtn.textContent = 'Пауза';
        timerBtn.classList.replace('bg-slate-700', 'bg-rose-600');
        
        timerInterval = setInterval(() => {
            if (timerSeconds > 0) {
                timerSeconds--;
                const m = Math.floor(timerSeconds / 60).toString().padStart(2, '0');
                const s = (timerSeconds % 60).toString().padStart(2, '0');
                timerDisplay.textContent = `${m}:${s}`;
            } else {
                clearInterval(timerInterval);
                alert('Время фокуса вышло! Пора отдохнуть.');
                timerSeconds = 5 * 60;
                timerDisplay.textContent = "05:00";
                timerBtn.textContent = 'Старт фокуса';
            }
        }, 1000);
    }
    isTimerRunning = !isTimerRunning;
}

timerBtn.addEventListener('click', toggleTimer);