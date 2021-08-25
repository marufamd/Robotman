import { oneLine } from 'common-tags';
import type { Snowflake, User } from 'discord.js';
import Colors from './json/colors.json';
import Pokemon from './json/pokemon.json';
import Timezones from './json/timezones.json';
import Words from './json/words.json';
import publishers from './json/publishers.json';
import { codeBlock } from '@discordjs/builders';

export { Colors, Pokemon, Timezones, Words };

export const Akinator = {
	MAX_TIME: 60000,
	IMAGES: {
		END: 'https://i.imgur.com/m3nIXvs.png',
		RANDOM: ['https://i.imgur.com/2xGxFEr.png', 'https://i.imgur.com/8P54YME.png']
	},
	REPLACE: {
		's/724826__99926454.jpg': 'tttQgxw.jpg',
		'o/790322__776944019.jpg': 'jCb7p4V.png'
	},
	RESPONSES: {
		KEEP_GOING: 'Hmmm, Should I keep going then?',
		WIN: [
			"Great! I've guessed right once again!",
			'Great! I have won once again!',
			'Nice, guessed right one more time!',
			"Yes! I'm victorious once again!",
			"Looks like I've won!"
		],
		LOSS: [
			"Seems that I've been beaten. Till next time!",
			'Bravo, you have defeated me!',
			"Damn, you're good. Till next time!",
			"Darn, looks like I've been beaten!",
			"I've lost! You truly are a worthy opponent. Till next time!"
		],
		TIMEOUT: ["Silence. Looks like I've won!", "Time's up! Seems like I've won!"]
	}
};

export const ALIAS_REPLACEMENT_REGEX = /-/g;

export const Channels = {
	RECOMMENDATION: ['538424492544884738', '248985053441294337', '763091344590897182'],
	NEWS: {
		COMICS: '768918224170647566',
		TV_MOVIES: '625755932663480320'
	}
} as {
	RECOMMENDATION: Snowflake[];
	NEWS: Record<string, Snowflake>;
};

export const ConnectFour = {
	PIECES: {
		default: '<:blank:769981408990068836>',
		yellow: '<:yellow:769980715697700874>',
		red: '<:red:769980739361570836>'
	},
	NUMBERS: [
		'<:c1:771557387944722462>',
		'<:c2:771557387907104779>',
		'<:c3:771557387798577183>',
		'<:c4:771557387634606091>',
		'<:c5:771557388108955679>',
		'<:c6:771557388057706538>',
		'<:c7:771557387814567939>'
	],
	INDICATORS: {
		RED: '🔴',
		YELLOW: '🟡'
	},
	CANCEL_TIME: 15,
	WAIT_TIME: 1
};

export const DateFormats = {
	LOG: 'MMMM D YYYY, [at] h:mm A',
	UPTIME: 'D[d], H[h], m[m], s[s]',
	LOCG: 'YYYY-MM-DD',
	CLOCK: 'h:mm A',
	REGULAR: "MMMM d',' y",
	DAYS: 'd',
	TEMPLATE: 'MMMM D'
} as const;

export const Emojis = {
	SUCCESS: `✅`,
	FAIL: '❌',
	DELETE: '🗑️',
	TIMER: '<a:Timer:654794151841366058>',
	LOADING: '<a:slashloading:869272562272714763>'
} as const;

export const Hangman = {
	WAIT_TIME: 60000,
	EMOJIS: {
		HEAD: '😐',
		SHIRT: '👕',
		LEFT_HAND: '🤚',
		RIGHT_HAND: '🖐️',
		PANTS: '🩳',
		SHOE: '👞'
	}
} as const;

export const Links = {
	BULBAPEDIA: 'https://bulbapedia.bulbagarden.net',
	LETTERBOXD: 'https://letterboxd.com',
	HASTEBIN: 'https://starb.in',
	PASTE_EE: 'https://api.paste.ee/v1/pastes',
	GOOGLE: 'https://www.googleapis.com',
	MERIAM_WEBSTER: 'https://www.merriam-webster.com',
	DICTIONARY: 'https://www.dictionaryapi.com/api/v3/references',
	DAD_JOKE: 'https://icanhazdadjoke.com/',
	DISCORD: 'https://discord.com',
	IMGUR: 'https://api.imgur.com',
	REDDIT: 'https://www.reddit.com',
	COMICVINE: 'https://comicvine.gamespot.com',
	TV_MAZE: 'https://api.tvmaze.com',
	WIKIPEDIA: 'https://en.wikipedia.org'
} as const;

export const LogTypes = {
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
} as const;

export const NO_RESULTS_FOUND = { content: 'No results found', ephemeral: true };

export const PRODUCTION = process.env.NODE_ENV === 'production';

export const PromptOptions = {
	MAX_RETRIES: 3,
	TIME: 30000,
	TEXT: {
		START: (text: string) => `${text}\n\nTo cancel the command, type \`cancel\`.`,
		RETRY: (text: string) => `Please try again. ${text}\n\nTo cancel the command, type \`cancel\`.`,
		TIMEOUT: 'You took too long to respond. The command has been cancelled.',
		FAIL: "You've retried too many times. The command has been cancelled.",
		CANCEL: 'Cancelled the command.'
	},
	ERRORS: {
		RETRY_LIMIT: 'retries',
		TIMEOUT: 'timeout',
		INCORRECT_TYPE: 'type',
		CANCELLED: 'cancel'
	}
} as const;

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

export const Publishers = new Map(Object.entries(publishers as Record<Publisher, PublisherData>));

export const Pull = {
	DEFAULT: {
		PREVIOUS: ['pull-last', 'pl', 'plast'],
		NEXT: ['pull-next', 'pn', 'pnext']
	},
	USER: {
		PREVIOUS: ['pull-last-user', 'plu', 'plastuser', 'pluser'],
		NEXT: ['pull-next-user', 'pnu', 'pnextuser', 'pnuser']
	}
};

export const ScheduleTime = {
	DAY: 0,
	HOUR: 1,
	MINUTE: 0
} as const;

export const Shows = new Set<number>([
	13, // The Flash
	689, // Young Justice
	706, // Teen Titans Go!
	1850, // Supergirl
	1851, // Legends of Tomorrow
	1859, // Lucifer
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
	51042 // Batwheels
]);

export const Recommendations = {
	TEXT: {
		TASTE_TEST: oneLine`
        Welcome to **Taste Test**, where you can sample our mods' and boosters'
        personal recommendations and personal taste! Feel free to engage us on a discussion,
        and please, have fun discovering what we love.`,
		MODERATOR: oneLine`
        Welcome to **Taste Test**, where you can sample our mods' personal
        recommendations and personal taste! Feel free to engage us on a discussion,
        and please, have fun discovering what we love.`,
		BOOSTER: oneLine`
        Welcome to a special **Taste Test**, where you can sample our **Boosters'** personal
        recommendations and personal taste! Feel free to engage us on a discussion, and please,
        have fun discovering what we love.`,
		CHARACTER: oneLine`
		Browse our recs lists! Simply type in the key phrases shown in the []s to bring up a
		list of entry-point reads! For more detailed listings, type .reclist`,
		WRITER: oneLine`
		To summon a brief list of a creator's notable works, simply type in their **FULL listed**
		name __below__ followed by "recs": ${codeBlock('EX: Jerry Siegel recs')}`
	},
	CUSTOM_TEXT: {
		batfamily: 'The Bat Family',
		'morrison bats': "Grant Morrison's Batman Epic",
		'johns green lantern': "Geoff Johns' Green Lantern Saga",
		legion: 'Legion of Super-Heroes',
		'mature readers': 'Vertigo/Black Label'
	},
	REGEX: {
		TASTE_TEST: /^taste test$/i,
		WRITER: /^writers? rec(ommendation)?s$/i,
		CHARACTER: /^(characters?\s)?rec(ommendation)?s(\sindex)?$/i
	}
} as const;

export const Tables = {
	AUTO_RESPONSES: {
		id: 'serial primary key',
		name: 'text not null',
		type: 'text not null',
		guild: 'varchar(20) not null',
		content: 'text not null',
		aliases: 'text[] default array[]::text[]',
		author: 'varchar(20) not null',
		author_tag: 'text not null',
		editor: 'varchar(20)',
		editor_tag: 'text',
		created: 'timestamp default current_timestamp',
		updated: 'timestamp',
		wildcard: 'boolean not null',
		embed: 'boolean not null',
		embed_color: 'varchar(7)'
	}
};

export const TicTacToe = {
	EMOJIS: {
		O: '⭕',
		X: '❌'
	},
	STYLES: {
		O: 'SUCCESS',
		X: 'DANGER'
	},
	MESSAGES: {
		MATCH: (player1: User, player2: User): string => `**${player1.tag}** vs. **${player2.tag}**`,
		TURN: (player1: User, player2: User, current: User): string =>
			`${TicTacToe.MESSAGES.MATCH(player1, player2)}\n\n${current.username}'s turn. You have 20 seconds.`,
		FORFEIT: (loser: User, winner: User): string =>
			`${TicTacToe.MESSAGES.MATCH(winner, loser)}\n\n**${loser.username}** has failed to make a move. **${winner.username}** wins!`,
		DRAW: (player1: User, player2: User): string => `${TicTacToe.MESSAGES.MATCH(player1, player2)}\n\nThe game is a draw!`,
		WIN: (winner: User, loser: User): string => `${TicTacToe.MESSAGES.MATCH(winner, loser)}\n\n**${winner.username}** wins!`
	}
} as const;

export const Trivia = {
	CATEGORIES: {
		dccomics: 'DC Comics',
		marvelcomics: 'Marvel Comics',
		dctv: 'DC Television'
	},
	DEFAULT_AMOUNT: 30,
	MAX_UNANSWERED: 15,
	MAX_TIME: 20000
};
