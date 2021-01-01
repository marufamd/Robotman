exports.colors = require('./colors');
exports.publishers = require('./publishers');
exports.words = require('./words');
exports.timezones = require('./timezones');
exports.pokemon = require('./pokemon');

exports.botColors = {
    main: 15905081,
    green: 56374,
    red: 14429952,
    yellow: 14458880,
    blue: 26844
};

exports.googleColors = ['#008744', '#0057e7', '#d62d20', '#ffa700'];

exports.logTypes = {
    log: { name: 'green', title: 'Log' },
    error: { name: 'red', title: 'Error' },
    info: { name: 'blue', title: 'Info' },
    warn: { name: 'yellow', title: 'Warning' }
};

exports.formats = {
    log: 'MMMM Do YYYY, [at] h:mm:ss A',
    uptime: 'D[d], H[h], m[m], s[s]',
    locg: 'YYYY-MM-DD',
    day: 'dddd'
};

exports.emojis = {
    timer: '<a:Timer:654794151841366058>',
    paginator: [
        '776869773123387392', // First Page
        '776869773127581708', // Previous Page
        '776869773278445576', // Next Page
        '776869773031374849', // Last Page
        '776865156180607006'  // Cancel
    ]
};

exports.shows = [
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

exports.aki = {
    images: ['https://i.imgur.com/2xGxFEr.png', 'https://i.imgur.com/8P54YME.png'],
    replace: {
        's/724826__99926454.jpg': 'tttQgxw.jpg',
        'o/790322__776944019.jpg': 'jCb7p4V.png'
    },
    responses: {
        all: ['yeah', 'nah', 'y', 'n', 'yep', 'nope', 'b', 'p', 'pn', 'idk', 'dunno', 'd', 'dk', 's', 'ye', 'probs', 'prob', 'probs not', 'prob not'],
        specific: ['yes', 'no', 'y', 'n', 'yeah', 'nah', 'ye', 'yep', 'nope'],
        final: {
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

exports.connectFour = {
    pieces: {
        default: '<:blank:769981408990068836>',
        yellow: '<:yellow:769980715697700874>',
        red: '<:red:769980739361570836>'
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

exports.groups = {
    dev: ['owner'],
    mod: ['moderation', 'tags']
};

exports.pull = {
    default: {
        previous: ["pulllast", "pl", "plast", "releaseslast"],
        next: ["pullnext", "pn", "pnext", "releasesnext"]
    },
    user: {
        previous: ["pulllastuser", "plu", "plastuser", "pluser", "releaseslastuser"],
        next: ["pullnextuser", "pnu", "pnextuser", "pnuser", "pullnu"]
    }
};

exports.channels = {
    rd: '549370319752921099'
};

exports.trivia = {
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

exports.hangmanEmojis = {
    head: '😐',
    shirt: '👕',
    leftHand: '🤚',
    rightHand: '🖐️',
    pants: '🩳',
    shoe: '👞'
};

exports.baseConfig = {
    aki: 0,
    hangman: 0,
    trivia: 0,
    connect_four: 0,
    commands_run: 0,
    webhook_url: null,
    schedule: []
};

exports.MAX_SEARCH_RESULTS = 8;

exports.ResponseTypes = indexMirror([
    'pong',
    'acknowledge',
    'message',
    'messageWithSource',
    'acknowledgeWithSource'
]);

exports.CommandOptionTypes = indexMirror([
    'subCommand',
    'subCommandGroup',
    'string',
    'integer',
    'boolean',
    'user',
    'channel',
    'role'
]);

function indexMirror(arr) {
    const obj = {};
    for (const [index, val] of arr.entries()) obj[val] = index + 1;
    return obj;
}