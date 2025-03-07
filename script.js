document.addEventListener('DOMContentLoaded', function() {
    // Document Object Model elements 
    const gameTitle = document.getElementById('gameTitle');
    const gameDetails = document.getElementById('gameDetails');
    const themeSwitch = document.getElementById('checkbox');
    
    // Making sure DOM elements exist
    if (!gameTitle || !gameDetails || !themeSwitch) {
        console.error('DOM elements not found');
        return;
    }

    // Constraint can be changed, but I think 7 is reasonable? 
    // This is just for the sake of having a constraint
    // gamesCache caches API responses for searching
    const gamesCache = new Map();
    const MAX_GAMES_PER_LIST = 7;

    // Async - runs in bg 
    // searchGames function (searchText parameter)
    // returns empty array if there is nothing
    // otherwise send to gamesCache map-key
    async function searchGames(searchText) {
        if (!searchText) return [];
        
        if (gamesCache.has(searchText)) {
            return gamesCache.get(searchText);
        }

        try {
            const response = await fetch('https://free-to-play-games-database.p.rapidapi.com/api/games', {
                method: 'GET',
                headers: {
                    'X-RapidAPI-Key': '67ee9bc620msh66f4d386df27ad3p13bba3jsn59959399040b',
                    'X-RapidAPI-Host': 'free-to-play-games-database.p.rapidapi.com'
                }
            });
            
            const data = await response.json();
            console.log('API resp:', data);

            if (!response.ok) {
                throw new Error(`API Error: ${data.message || 'Unknown error'}`);
            }

            const filteredGames = data
                .filter(game => game.title.toLowerCase().includes(searchText.toLowerCase()))
                .slice(0, 5);
            
            gamesCache.set(searchText, filteredGames);
            return filteredGames;
        } catch (error) {
            console.error('Error searching games:', error);
            return [];
        }
    }

    // auto complete function for search bar
    // debounceTimer to delay search results so API wont be overused
    function setAutoComplete() {
        let debounceTimer;
        
        gameTitle.addEventListener('input', function(e) {
            clearTimeout(debounceTimer);
            const searchText = this.value;
            console.log('Search text:', searchText);
            
            // if input is too short, clear result
            if (searchText.length < 3) {
                const matchList = document.getElementById('match-list');
                if (matchList) matchList.innerHTML = '';
                return;
            }
    
            debounceTimer = setTimeout(async () => {
                console.log('Searching for:', searchText);
                const matchList = document.getElementById('match-list') || createMatchList(this.parentNode);
                matchList.innerHTML = '<div class="searching">Searching...</div>';
                
                const games = await searchGames(searchText);
                console.log('Found games:', games);
                
                if (games.length === 0) {
                    matchList.innerHTML = '<div class="no-results">No games found</div>';
                    return;
                }
                
                // iterate game suggestions in HTML format so it can also
                // display images of said game into a single string
                matchList.innerHTML = games
                    .map(game => `
                        <div class="game-suggestion" data-game-id="${game.id}">
                            <img src="${game.thumbnail}" alt="${game.title}" class="suggestion-image">
                            <div class="suggestion-info">
                                <div class="suggestion-title">${game.title}</div>
                                <div class="suggestion-genre">${game.genre}</div>
                            </div>
                        </div>
                    `).join('');
    
                // event listener to click on suggestions
                matchList.querySelectorAll('.game-suggestion').forEach((div) => {
                    div.addEventListener('click', async () => {
                        console.log('Game suggestion has been clicked');
                        const gameId = div.dataset.gameId;
                        console.log('Game ID:', gameId);
                        
                        gameDetails.innerHTML = '<div class="searching">Loading game details...</div>';
                        
                        const gameData = await getGameDetails(gameId);
                        console.log('Got game details:', gameData);
                        
                        if (gameData) {
                            displayGameDetails(gameData);
                            matchList.innerHTML = '';
                            gameTitle.value = '';
                        } else {
                            gameDetails.innerHTML = '<div class="no-results">Failed to load game details.</div>';
                        }
                    });
                });
            }, 300); //delay of 300ms
        });
    
        // clicking outside of suggestions closes the grid/list thing
        document.addEventListener('click', function(e) {
            if (!gameTitle.contains(e.target)) {
                const matchList = document.getElementById('match-list');
                if (matchList) matchList.innerHTML = '';
            }
        });
    }

    // autocomplete function for search text results - DOM 
    function createMatchList(parent) {
        const existingList = document.getElementById('match-list');
        if (existingList) {
            return existingList;
        }
        
        const matchList = document.createElement('div');
        matchList.setAttribute('id', 'match-list');
        matchList.setAttribute('class', 'autocomplete-items');
        parent.appendChild(matchList);
        return matchList;
    }

    // added feature - 5 star rating system  
    function generateStars(rating) {
        return Array(5).fill(0).map((_, index) => `
            <i class="fas fa-star star ${index < rating ? 'active' : ''}" 
               data-value="${index + 1}"></i>
        `).join('');
    }

    // rating for stars - mouse eventlistener
    function setupRatingSystem(gameId, currentRating) {
        const stars = document.querySelectorAll(`.rating-stars[data-game-id="${gameId}"] .star`);
        const ratingValue = document.querySelector('.rating-value');

        stars.forEach((star, index) => {
            star.addEventListener('click', () => {
                const newRating = index + 1;
                updateRating(gameId, newRating);
            });

            star.addEventListener('mouseover', () => {
                highlightStars(stars, index);
            });

            star.addEventListener('mouseout', () => {
                resetStars(stars, currentRating);
            });
        });
    }

    // update star rating - individual to user
    function updateRating(gameId, rating) {
        localStorage.setItem(`rating-${gameId}`, rating);
        const ratingStars = document.querySelector(`.rating-stars[data-game-id="${gameId}"]`);
        const ratingValue = document.querySelector('.rating-value');
        
        ratingStars.innerHTML = generateStars(rating);
        ratingValue.textContent = `${rating}/5`;
        
        setupRatingSystem(gameId, rating);
    }

    // function to highlight stars
    function highlightStars(stars, index) {
        stars.forEach((star, i) => {
            star.classList.toggle('active', i <= index);
        });
    }

    // function that resets the stars
    function resetStars(stars, rating) {
        stars.forEach((star, i) => {
            star.classList.toggle('active', i < rating);
        });
    }

    // API KEY might be needed for other users?
    // fetches data needed for the games
    // need exception handling
    async function getGameDetails(gameId) {
        try {
            const response = await fetch(`https://free-to-play-games-database.p.rapidapi.com/api/game?id=${gameId}`, {
                method: 'GET',
                headers: {
                    'X-RapidAPI-Key': '67ee9bc620msh66f4d386df27ad3p13bba3jsn59959399040b',
                    'X-RapidAPI-Host': 'free-to-play-games-database.p.rapidapi.com'
                }
            });
            
            console.log('Getting game details for ID:', gameId);
            const data = await response.json();
            console.log('Game details:', data);
            
            if (!response.ok) {
                throw new Error(`API Error: ${data.message || 'Unknown error'}`);
            }
            
            return data;
        } catch (error) {
            console.error('Error getting game details:', error);
            return null;
        }
    }

    // display game details in HTML format
    function displayGameDetails(game) {
        console.log('Displaying game details:', game);
        // get rating from user browser data
        const userRating = localStorage.getItem(`rating-${game.id}`) || 0;
        
        gameDetails.innerHTML = `
            <div class="game-details-header">
                <button class="btn btn-outline-secondary back-button" onclick="showGameLibrary()">
                    <i class="fas fa-arrow-left"></i> Back to Library
                </button>
            </div>
            <img src="${game.thumbnail}" alt="${game.title}" class="game-details-image">
            <div class="game-info">
                <h2 class="game-title">${game.title}</h2>
                <div class="game-genre">${game.genre}</div>
                <div class="game-rating mb-3">
                    <div class="rating-stars" data-game-id="${game.id}">
                        ${generateStars(userRating)}
                    </div>
                    <span class="rating-value">${userRating}/5</span>
                </div>
                <div class="game-description mb-4">
                    <h4>About</h4>
                    <p>${game.short_description}</p>
                </div>
                <div class="game-metadata mb-4">
                    <p><strong>Platform:</strong> ${game.platform}</p>
                    <p><strong>Publisher:</strong> ${game.publisher}</p>
                    <p><strong>Release Date:</strong> ${game.release_date}</p>
                </div>
                <div class="add-game-buttons">
                    <button class="btn btn-outline-warning" onclick="addGameToList('${game.id}', 'wishlist')">
                        Add to Wishlist
                    </button>
                    <button class="btn btn-outline-info" onclick="addGameToList('${game.id}', 'inProgress')">
                        Add to In Progress
                    </button>
                    <button class="btn btn-outline-success" onclick="addGameToList('${game.id}', 'completed')">
                        Add to Completed
                    </button>
                </div>
            </div>
        `;

        setupRatingSystem(game.id, userRating);
    }

    // dark and light mode switch
    const html = document.documentElement;
    const currentTheme = localStorage.getItem('theme');
    if (currentTheme) {
        html.setAttribute('data-bs-theme', currentTheme);
        themeSwitch.checked = currentTheme === 'dark';
    }

    themeSwitch.addEventListener('change', function() {
        const newTheme = this.checked ? 'dark' : 'light';
        html.setAttribute('data-bs-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    });

    // funciton to add game to 3 lists- max 7
    window.addGameToList = async function(gameId, listId) {
        console.log('Adding game to list:', listId);
        const list = document.getElementById(listId);
        if (list.children.length >= MAX_GAMES_PER_LIST) {
            alert(`Cannot add more games to this list. Maximum limit of (${MAX_GAMES_PER_LIST}) games reached.`);
            return;
        }

        const gameDetails = await getGameDetails(gameId);
        if (gameDetails) {
            const gameCard = createGameCard(gameDetails);
            list.appendChild(gameCard);

            if (listId === 'completed') {
                playSound();
            }
        }
    };

    setAutoComplete();

    // filter function for games
    function initializeFilters() {
        const showFiltersBtn = document.getElementById('showFilters');
        const filtersPanel = document.getElementById('filtersPanel');
        const applyFiltersBtn = document.getElementById('applyFilters');
        const resetFiltersBtn = document.getElementById('resetFilters');

        showFiltersBtn.addEventListener('click', () => {
            filtersPanel.style.display = filtersPanel.style.display === 'none' ? 'block' : 'none';
        });

        applyFiltersBtn.addEventListener('click', applyFilters);
        resetFiltersBtn.addEventListener('click', resetFilters);
    }

    async function applyFilters() {
        const platform = document.getElementById('platformFilter').value;
        const genre = document.getElementById('genreFilter').value;
        const sort = document.getElementById('sortFilter').value;
        
        // loading indication on left-hand side
        gameDetails.innerHTML = `
            <div class="library-loading">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Finding games...</p>
            </div>
        `;
        
        try {
            let url = 'https://free-to-play-games-database.p.rapidapi.com/api/games';
            const params = new URLSearchParams();
            
            if (platform) params.append('platform', platform);
            if (genre) params.append('category', genre);
            if (sort) params.append('sort-by', sort);
            
            if (params.toString()) {
                url += '?' + params.toString();
            }

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'X-RapidAPI-Key': '67ee9bc620msh66f4d386df27ad3p13bba3jsn59959399040b',
                    'X-RapidAPI-Host': 'free-to-play-games-database.p.rapidapi.com'
                }
            });

            const games = await response.json();
            displayFilteredGamesInLibrary(games);
        } catch (error) {
            console.error('Error fetching filtered games:', error);
            gameDetails.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Failed to load games. Please try again.</p>
                </div>
            `;
        }
    }

    // function to display filtered games on LHS
    // HTML to display details of game
    function displayFilteredGamesInLibrary(games) {
        const activeFilters = [];
        const platform = document.getElementById('platformFilter').value;
        const genre = document.getElementById('genreFilter').value;
        const sort = document.getElementById('sortFilter').value;

        if (platform) activeFilters.push(`Platform: ${platform.toUpperCase()}`);
        if (genre) activeFilters.push(`Genre: ${genre.charAt(0).toUpperCase() + genre.slice(1)}`);
        if (sort) activeFilters.push(`Sort: ${sort.charAt(0).toUpperCase() + sort.slice(1)}`);

        gameDetails.innerHTML = `
            <div class="game-library">
                <div class="library-header">
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <h3 class="library-title">Filtered Games</h3>
                        <button class="btn btn-outline-secondary back-button" onclick="showGameLibrary()">
                            <i class="fas fa-arrow-left"></i> Back to Library
                        </button>
                    </div>
                    ${activeFilters.length > 0 ? `
                        <div class="active-filters mb-3">
                            ${activeFilters.map(filter => `
                                <span class="filter-tag">${filter}</span>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
                ${games.length === 0 ? `
                    <div class="no-results">
                        <i class="fas fa-search"></i>
                        <p>No games found matching your filters</p>
                    </div>
                ` : `
                    <div class="library-grid">
                        ${games.map(game => `
                            <div class="library-game-card" data-game-id="${game.id}">
                                <div class="library-game-thumbnail">
                                    <img src="${game.thumbnail}" alt="${game.title}">
                                    <div class="library-game-overlay">
                                        <button class="btn btn-sm btn-light">View Details</button>
                                    </div>
                                </div>
                                <div class="library-game-info">
                                    <h5 class="library-game-title">${game.title}</h5>
                                    <p class="library-game-genre">${game.genre}</p>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>
        `;

        // click event listeners for filtered games
        gameDetails.querySelectorAll('.library-game-card').forEach(card => {
            card.addEventListener('click', async () => {
                const gameId = card.dataset.gameId;
                const gameData = await getGameDetails(gameId);
                if (gameData) {
                    displayGameDetails(gameData);
                }
            });
        });
    }

    function resetFilters() {
        document.getElementById('platformFilter').value = '';
        document.getElementById('genreFilter').value = '';
        document.getElementById('sortFilter').value = 'relevance';
        // back button to exit out of filtered games
        showGameLibrary(); 
    }

    //init filters - ideally none upon first loading
    initializeFilters();

    // function to load popular games on homescreen
    async function getGameLib() {
        try {
            const response = await fetch('https://free-to-play-games-database.p.rapidapi.com/api/games', {
                method: 'GET',
                headers: {
                    'X-RapidAPI-Key': '67ee9bc620msh66f4d386df27ad3p13bba3jsn59959399040b',
                    'X-RapidAPI-Host': 'free-to-play-games-database.p.rapidapi.com'
                }
            });

            const games = await response.json();
            // shows at most 25 games
            displayGameLibrary(games.slice(0, 25)); 
        } catch (error) {
            console.error('Error getting game library:', error);
        }
    }

    // function to display lib on LHS to HTML
    function displayGameLibrary(games) {
        gameDetails.innerHTML = `
            <div class="game-library">
                <h3 class="library-title mb-4">Popular Games</h3>
                <div class="library-grid">
                    ${games.map(game => `
                        <div class="library-game-card" data-game-id="${game.id}">
                            <div class="library-game-thumbnail">
                                <img src="${game.thumbnail}" alt="${game.title}">
                                <div class="library-game-overlay">
                                    <button class="btn btn-sm btn-light">View Details</button>
                                </div>
                            </div>
                            <div class="library-game-info">
                                <h5 class="library-game-title">${game.title}</h5>
                                <p class="library-game-genre">${game.genre}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        // click event listeners for each game
        gameDetails.querySelectorAll('.library-game-card').forEach(card => {
            card.addEventListener('click', async () => {
                const gameId = card.dataset.gameId;
                const gameData = await getGameDetails(gameId);
                if (gameData) {
                    displayGameDetails(gameData);
                }
            });
        });
    }

    // init popular game library
    getGameLib();

    // back button
    window.showGameLibrary = function() {
        getGameLib();
    };
});

// function to delete game from user broswer
function deleteGame(id) {
    const games = JSON.parse(localStorage.getItem('games') || '[]');
    const updatedGames = games.filter(game => game.id !== id);
    localStorage.setItem('games', JSON.stringify(updatedGames));
    
    document.querySelector(`div[data-id="${id}"]`).remove();
}

function updateStatus(id, newStatus) {
    const games = JSON.parse(localStorage.getItem('games') || '[]');
    const gameIndex = games.findIndex(game => game.id === id);
    if (gameIndex !== -1) {
        games[gameIndex].status = newStatus;
        localStorage.setItem('games', JSON.stringify(games));
    }
}

// transfer data to 3-grid
function handleDragStart(e) {
    e.target.classList.add('dragging');
    e.dataTransfer.setData('text/plain', e.target.id);
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    document.querySelectorAll('.status-column').forEach(column => {
        column.classList.remove('drag-over');
    });
}

// add game to 3-grid 
function addGameToGrid(game) {
    const statusClass = {
        'Wishlist': 'status-wishlist',
        'In Progress': 'status-progress',
        'Completed': 'status-completed'
    };

    const gameCard = document.createElement('div');
    gameCard.className = 'col';
    gameCard.dataset.id = game.id;
    
    gameCard.innerHTML = `
        <div class="card game-card">
            <img src="${game.imageURL}" class="game-image" alt="${game.title}">
            <div class="game-status ${statusClass[game.status]}">${game.status}</div>
            <div class="card-body">
                <h5 class="card-title">${game.title}</h5>
                <p class="card-text">${game.genre}</p>
                <div class="d-flex justify-content-between align-items-center">
                    <select class="form-select status-select" onchange="updateStatus(${game.id}, this.value)">
                        <option value="Wishlist" ${game.status === 'Wishlist' ? 'selected' : ''}>Wishlist</option>
                        <option value="In Progress" ${game.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                        <option value="Completed" ${game.status === 'Completed' ? 'selected' : ''}>Completed</option>
                    </select>
                    <button class="btn btn-danger ms-2" onclick="deleteGame(${game.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
    
    gameGrid.appendChild(gameCard);
}

// load up pre-existing from user localstorage
function loadGames() {
    const games = JSON.parse(localStorage.getItem('games') || '[]');
    games.forEach(game => addGameToGrid(game));
}


// function that adds game to col
function addGameToColumn(game) {
    const column = document.getElementById(game.status.toLowerCase().replace(' ', ''));
    const gameList = column.querySelector('.game-list');
    
    if (gameList.children.length >= MAX_GAMES_PER_LIST) {
        alert(`Cannot add more games to ${game.status}. Maximum limit of (${MAX_GAMES_PER_LIST}) games reached.`);
        return;
    }

    const gameCard = createGameCard(game);
    gameList.appendChild(gameCard);
}

function createGameCard(game) {
    const div = document.createElement('div');
    div.className = 'card game-card';
    div.draggable = true;
    div.id = `game-${Date.now()}`;
    
    div.innerHTML = `
        <div class="card-body">
            <div class="d-flex align-items-center justify-content-between">
                <div class="d-flex align-items-center">
                    <img src="${game.imageUrl}" alt="${game.title}" 
                         class="suggestion-image me-3">
                    <div>
                        <h5 class="card-title mb-1">${game.title}</h5>
                        <p class="card-text text-muted mb-0">${game.genre}</p>
                    </div>
                </div>
                <button class="btn btn-danger btn-sm delete-game" aria-label="Delete game">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
    `;

    // user can delete game from cat
    div.querySelector('.delete-game').addEventListener('click', () => {
        div.remove();
    });

    // DO NOT remove -USED to transfer data
    div.addEventListener('dragstart', handleDragStart);
    div.addEventListener('dragend', handleDragEnd);
    
    return div;
}

// old function
function allowDrop(ev) {
    ev.preventDefault();
    const targetColumn = ev.currentTarget;
    const gameList = targetColumn.querySelector('.game-list');

    if (gameList.children.length < MAX_GAMES_PER_LIST) {
        targetColumn.classList.add('drag-over');
    }
}

// old function
function drop(ev) {
    ev.preventDefault();
    const targetColumn = ev.currentTarget;
    targetColumn.classList.remove('drag-over');
    
    const gameId = ev.dataTransfer.getData('text/plain');
    const gameElement = document.getElementById(gameId);
    const targetList = targetColumn.querySelector('.game-list');
    
    if (targetList.children.length >= MAX_GAMES_PER_LIST) {
        alert(`Cannot add more games to this list. Maximum limit of (${MAX_GAMES_PER_LIST}) games reached.`);
        return;
    }
    
    targetList.appendChild(gameElement);
}

// this function plays sound when game is completed
function playSound() {
    // this part of code was generated with AI assistance..it works ! :D
    const audio = new Audio('https://noproblo.dayjo.org/zeldasounds/LOZ/LOZ_Secret.wav');
    audio.volume = 0.3;
    audio.play()
        .then(() => console.log('Sound played successfully'))
        .catch(error => console.error('Error playing sound:', error));
}