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
    days: 'd'
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

export const shows = [
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
    42668, // Y: The Last Man
    42827, // The Sandman
    44751, // Superman and Lois
    44776, // Green Lantern
    44777, // Strange Adventures
    47261, // Justice League Dark
    51042  // Batwheels
];

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
    images: ['https://i.imgur.com/2xGxFEr.png', 'https://i.imgur.com/8P54YME.png'],
    replace: {
        's/724826__99926454.jpg': 'tttQgxw.jpg',
        'o/790322__776944019.jpg': 'jCb7p4V.png'
    },
    responses: {
        'all': ['yeah', 'nah', 'y', 'n', 'yep', 'nope', 'b', 'p', 'pn', 'idk', 'dunno', 'd', 'dk', 's', 'ye', 'probs', 'prob', 'probs not', 'prob not'],
        'specific': ['yes', 'no', 'y', 'n', 'yeah', 'nah', 'ye', 'yep', 'nope'],
        'final': {
            win: [
                'Great! I\'ve guessed right once again!',
                'Great! I have won once again!',
                'Nice, guessed right one more time!',
                'Yes! I\'m victorious once again!',
                'Looks like I\'ve won!'
            ],
            lost: [
                'Seems that I\'ve been beaten. Till next time!',
                'Bravo, you have defeated me!',
                'Damn, you\'re good. Till next time!',
                'Darn, looks like I\'ve been beaten!',
                'I\'ve lost! You truly are a worthy opponent. Till next time!'
            ],
            silent: [
                'Silence. Looks like I\'ve won!',
                'Time\'s up! Seems like I\'ve won!'
            ]
        }
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
    timer: 'https://i.imgur.com/569T4Tg.gif'
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
    | 'aftershock'
    | 'zenescope';

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
        thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/MarvelLogo.svg/1280px-MarvelLogo.svg.png'
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
    ['boom', {
        id: 13,
        name: 'BOOM! Studios',
        color: 16777201,
        thumbnail: 'https://i.imgur.com/686ZNQd.png'
    }],
    ['valiant', {
        id: 34,
        name: 'Valiant',
        color: 15678244,
        thumbnail: 'http://valiantuniverse.com/wp-content/uploads/2012/04/Valiant-logo-main-master.jpg'
    }],
    ['archie', {
        id: 21,
        name: 'Archie Comics',
        color: 16116003,
        thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/6/62/Archiecomicslogo.png'
    }],
    ['dynamite', {
        id: 12,
        name: 'Dynamite',
        color: 16767316,
        thumbnail: 'https://i.imgur.com/UNcHnf4.jpg'
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
    ['zenescope', {
        id: 17,
        name: 'Zenescope',
        color: 0,
        thumbnail: 'https://i.imgur.com/QLnCQan.png'
    }]
]);