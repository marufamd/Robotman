import { oneLine } from 'common-tags';
import type { MessageButtonStyleResolvable, User } from 'discord.js';
import colors from './colors.json';
import pokemon from './pokemon.json';
import timezones from './timezones.json';
import words from './words.json';

export { colors, pokemon, timezones, words };

export const formats = {
    log: "MMMM d yyyy, 'at' tt",
    uptime: "d'd', h'h', m'm', s's'",
    locg: 'y-MM-dd',
    day: 'EEEE',
    clock: "h':'mm a",
    regular: "MMMM d',' y",
    days: 'd',
    template: 'MMMM d'
};

export const logTypes = {
    log: {
        name: 'green',
        title: 'Log',
        color: 56374
    },
    error: {
        name: 'red',
        title: 'Error',
        color: 14429952
    },
    info: {
        name: 'blue',
        title: 'Info',
        color: 26844
    },
    warn: {
        name: 'yellow',
        title: 'Warning',
        color: 14458880
    }
};

export const EPOCH = 1420070400000;

export const shows = new Set([
    13,    // The Flash
    689,   // Young Justice
    706,   // Teen Titans Go!
    1850,  // Supergirl
    1851,  // Legends of Tomorrow
    1859,  // Lucifer
    20683, // Black Lightning
    27557, // Titans
    36745, // Doom Patrol
    36774, // Pennyworth
    37776, // Batwoman
    37809, // Stargirl
    39764, // Sweet Tooth
    42668, // Y: The Last Man
    42827, // The Sandman
    44751, // Superman and Lois
    44776, // Green Lantern
    44777, // Strange Adventures
    47261, // Justice League Dark
    51042  // Batwheels
]);

export const trivia = {
    categories: [
        'dccomics',
        'marvelcomics',
        'dctv'
    ],
    DEFAULT_NUM: 30,
    MAX_UNANSWERED: 15,
    STOP_RESPONSE: 'triviastop',
    SCOREBOARD_RESPONSE: 'scoreboard'
};

export const connectFour = {
    pieces: {
        'default': '<:blank:769981408990068836>',
        'yellow': '<:yellow:769980715697700874>',
        'red': '<:red:769980739361570836>'
    },
    nums: [
        '<:c1:771557387944722462>',
        '<:c2:771557387907104779>',
        '<:c3:771557387798577183>',
        '<:c4:771557387634606091>',
        '<:c5:771557388108955679>',
        '<:c6:771557388057706538>',
        '<:c7:771557387814567939>'
    ],
    indicators: {
        red: '🔴',
        yellow: '🟡'
    },
    CANCEL_TIME: 15,
    WAIT_TIME: 1
};

export const ticTacToe = {
    emojis: {
        o: '⭕',
        x: '❌'
    },
    styles: {
        o: 'SUCCESS',
        x: 'DANGER'
    },
    messages: {
        match: (player1, player2) => `**${player1.tag}** vs. **${player2.tag}**`,
        turn: (player1, player2, current) => `${ticTacToe.messages.match(player1, player2)}\n\n${current.username}'s turn. You have 20 seconds.`,
        forfeit: (loser, winner) => `${ticTacToe.messages.match(winner, loser)}\n\n**${loser.username}** has failed to make a move. **${winner.username}** wins!`,
        draw: (player1, player2) => `${ticTacToe.messages.match(player1, player2)}\n\nThe game is a draw!`,
        win: (winner, loser) => `${ticTacToe.messages.match(winner, loser)}\n\n**${winner.username}** wins!`
    }
} as {
    emojis: Record<string, string>;
    styles: Record<string, MessageButtonStyleResolvable>;
    messages: Record<string, (player1?: User, player2?: User, current?: User) => string>;
};

export const pull = {
    default: {
        previous: ['pull-last', 'pl', 'plast'],
        next: ['pull-next', 'pn', 'pnext']
    },
    user: {
        previous: ['pull-last-user', 'plu', 'plastuser', 'pluser'],
        next: ['pull-next-user', 'pnu', 'pnextuser', 'pnuser', 'pullnu']
    }
};

export const aki = {
    images: {
        end: 'https://i.imgur.com/m3nIXvs.png',
        random: ['https://i.imgur.com/2xGxFEr.png', 'https://i.imgur.com/8P54YME.png']
    },
    replace: {
        's/724826__99926454.jpg': 'tttQgxw.jpg',
        'o/790322__776944019.jpg': 'jCb7p4V.png'
    },
    responses: {
        keepGoing: 'Hmmm, Should I keep going then?',
        win: [
            'Great! I\'ve guessed right once again!',
            'Great! I have won once again!',
            'Nice, guessed right one more time!',
            'Yes! I\'m victorious once again!',
            'Looks like I\'ve won!'
        ],
        loss: [
            'Seems that I\'ve been beaten. Till next time!',
            'Bravo, you have defeated me!',
            'Damn, you\'re good. Till next time!',
            'Darn, looks like I\'ve been beaten!',
            'I\'ve lost! You truly are a worthy opponent. Till next time!'
        ],
        timeout: [
            'Silence. Looks like I\'ve won!',
            'Time\'s up! Seems like I\'ve won!'
        ]
    }
};

export const emojis = {
    hangman: {
        head: '😐',
        shirt: '👕',
        leftHand: '🤚',
        rightHand: '🖐️',
        pants: '🩳',
        shoe: '👞'
    },
    timer: '<a:Timer:654794151841366058>'
};

export const wikiParams = (query: string) => ({
    action: 'query',
    titles: query,
    prop: 'extracts|pageimages|links',
    format: 'json',
    formatversion: 2,
    exintro: true,
    redirects: true,
    explaintext: true,
    pithumbsize: 1000
});

export type Publisher =
    | 'dc'
    | 'marvel'
    | 'image'
    | 'darkhorse'
    | 'idw'
    | 'boom'
    | 'valiant'
    | 'archie'
    | 'dynamite'
    | 'vault'
    | 'milestone'
    | 'aftershock'
    | 'zenescope'
    | 'ahoy';

export interface PublisherData {
    id: number;
    name: string;
    color: number;
    thumbnail: string;
}

export const publishers = new Map<Publisher, PublisherData>([
    ['dc', {
        id: 1,
        name: 'DC Comics',
        color: 31472,
        thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/DC_Comics_logo.svg/1024px-DC_Comics_logo.svg.png'
    }],
    ['marvel', {
        id: 2,
        name: 'Marvel Comics',
        color: 15538723,
        thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Marvel_Logo.svg/1200px-Marvel_Logo.svg.png'
    }],
    ['darkhorse', {
        id: 5,
        name: 'Dark Horse Comics',
        color: 0,
        thumbnail: 'https://upload.wikimedia.org/wikipedia/en/thumb/f/f8/Dark_Horse_Comics_logo.svg/1200px-Dark_Horse_Comics_logo.svg.png'
    }],
    ['idw', {
        id: 6,
        name: 'IDW Publishing',
        color: 204861,
        thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/IDW_Publishing_logo.svg/1200px-IDW_Publishing_logo.svg.png'
    }],
    ['image', {
        id: 7,
        name: 'Image Comics',
        color: 15395562,
        thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/Image_Comics_logo.svg/452px-Image_Comics_logo.svg.png'
    }],
    ['dynamite', {
        id: 12,
        name: 'Dynamite',
        color: 16767316,
        thumbnail: 'https://i.imgur.com/UNcHnf4.jpg'
    }],
    ['boom', {
        id: 13,
        name: 'BOOM! Studios',
        color: 16777201,
        thumbnail: 'https://i.imgur.com/686ZNQd.png'
    }],
    ['zenescope', {
        id: 17,
        name: 'Zenescope',
        color: 0,
        thumbnail: 'https://i.imgur.com/QLnCQan.png'
    }],
    ['archie', {
        id: 21,
        name: 'Archie Comics',
        color: 16116003,
        thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/6/62/Archiecomicslogo.png'
    }],
    ['valiant', {
        id: 34,
        name: 'Valiant',
        color: 15678244,
        thumbnail: 'http://valiantuniverse.com/wp-content/uploads/2012/04/Valiant-logo-main-master.jpg'
    }],
    ['milestone', {
        id: 59,
        name: 'Milestone Comics',
        color: 0,
        thumbnail: 'https://i.imgur.com/8WVi3pV.png'
    }],
    ['vault', {
        id: 261,
        name: 'Vault Comics',
        color: 0,
        thumbnail: 'https://i.imgur.com/kaFHKQp.png'
    }],
    ['aftershock', {
        id: 159,
        name: 'Aftershock Comics',
        color: 12391451,
        thumbnail: 'https://insidepulse.com/wp-content/uploads/2019/06/AfterShock-Comics-logo.png'
    }],
    ['ahoy', {
        id: 524,
        name: 'Ahoy Comics',
        color: 14370876,
        thumbnail: 'https://upload.wikimedia.org/wikipedia/en/thumb/7/71/AhoyComicsLogo.png/220px-AhoyComicsLogo.png'
    }]
]);

export const tasteTestText = oneLine`
Welcome to **Taste Test**, where you can sample our mods' and boosters' 
personal recommendations and personal taste! Feel free to engage us on a discussion, 
and please, have fun discovering what we love.
`;

export const recChannels = ['538424492544884738', '248985053441294337', '763091344590897182'];