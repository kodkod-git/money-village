// Shared player/team list renderer for bank and quiz activity screens.

function renderActivityTabs({ hasTeamView, viewMode, tabBarId, teamTabId, individualTabId }) {
    const tabBar = document.getElementById(tabBarId);
    if (!tabBar) return;

    tabBar.style.display = hasTeamView ? 'flex' : 'none';
    if (!hasTeamView) return;

    const teamTab = document.getElementById(teamTabId);
    const individualTab = document.getElementById(individualTabId);
    if (teamTab) teamTab.classList.toggle('active', viewMode === 'team');
    if (individualTab) individualTab.classList.toggle('active', viewMode === 'individual');
}

function createActivityPlayerCard({ player, done, disabled, onClick }) {
    const card = document.createElement('div');
    card.className = 'bank-player-card player-button'
        + (done ? ' completed' : '')
        + (disabled ? ' is-disabled' : '');
    card.innerHTML = `<div class="bank-player-name-row"><span class="bank-player-nickname">${player.nickname}</span></div>`;
    if (!disabled && typeof onClick === 'function') card.onclick = onClick;
    return card;
}

function renderActivityPlayerList({
    grid,
    players,
    useTeamGroups,
    sortIndividualsByTeam = false,
    getPlayerGroupState,
    getTeamGroupState,
    getPlayerCardState,
}) {
    if (!grid) return;

    grid.innerHTML = '';
    grid.classList.toggle('is-team', !!useTeamGroups);

    if (!useTeamGroups) {
        const sorted = players
            .map((p, idx) => ({ p, idx }))
            .sort((a, b) => {
                if (sortIndividualsByTeam) {
                    const teamCmp = (a.p.team_name || '').localeCompare(b.p.team_name || '', 'ko');
                    if (teamCmp !== 0) return teamCmp;
                }
                return (a.p.nickname || '').localeCompare(b.p.nickname || '', 'ko');
            });

        sorted.forEach(({ p, idx }) => {
            const groupState = getPlayerGroupState({ player: p, index: idx }) || {};
            const cardState = getPlayerCardState({ player: p, index: idx }) || {};
            const groupEl = createActivityGroup(groupState);
            const playersEl = createActivityPlayersWrap('1fr');

            playersEl.appendChild(createActivityPlayerCard({
                player: p,
                done: !!cardState.done,
                disabled: !!cardState.disabled,
                onClick: cardState.onClick,
            }));

            if (groupState.footerHtml) {
                const footer = document.createElement('div');
                footer.className = groupState.footerClassName || 'bank-player-indiv-tags';
                footer.innerHTML = groupState.footerHtml;
                playersEl.appendChild(footer);
            }

            groupEl.appendChild(playersEl);
            grid.appendChild(groupEl);
        });
        return;
    }

    const teams = new Map();
    players.forEach((p, idx) => {
        const key = p.team_name;
        if (!teams.has(key)) teams.set(key, []);
        teams.get(key).push({ p, idx });
    });

    [...teams.entries()]
        .sort(([a], [b]) => (a || '').localeCompare(b || '', 'ko'))
        .forEach(([teamKey, members]) => {
            members.sort((a, b) => (a.p.nickname || '').localeCompare(b.p.nickname || '', 'ko'));
            const groupState = getTeamGroupState({ teamKey, members }) || {};
            const groupEl = createActivityGroup(groupState);
            const playersEl = createActivityPlayersWrap('repeat(2, minmax(0, 1fr))');

            members.forEach(({ p, idx }) => {
                const cardState = getPlayerCardState({ player: p, index: idx, teamKey, members }) || {};
                playersEl.appendChild(createActivityPlayerCard({
                    player: p,
                    done: !!cardState.done,
                    disabled: !!cardState.disabled,
                    onClick: cardState.onClick,
                }));
            });

            groupEl.appendChild(playersEl);
            grid.appendChild(groupEl);
        });
}

function createActivityGroup({ done, inProgress, headerHtml }) {
    const groupEl = document.createElement('div');
    groupEl.className = 'team-group main-card'
        + (done ? ' team-done' : '')
        + (!done && inProgress ? ' team-in-progress' : '');

    const header = document.createElement('div');
    header.className = 'team-group-header main-card-header';
    header.innerHTML = headerHtml || '';
    groupEl.appendChild(header);

    return groupEl;
}

function createActivityPlayersWrap(columns) {
    const playersEl = document.createElement('div');
    playersEl.className = 'team-group-players main-card-body';
    playersEl.style.gridTemplateColumns = columns;
    return playersEl;
}
