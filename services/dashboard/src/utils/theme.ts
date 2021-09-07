import { extendTheme } from '@chakra-ui/react';

const theme = extendTheme({
	colors: {
		blurple: {
			100: '#888ef7',
			200: '#5966f2',
			300: '#2c3bed',
			400: '#2014d4',
			500: '#1f0da6',
			600: '#1a0777',
			700: '#13034a',
			800: '#09001e'
		}
	},
	components: {
		Accordion: {
			baseStyle: {
				container: {
					borderTopWidth: 0,
					_last: {
						borderBottomWidth: 0
					}
				}
			}
		}
	},
	config: {
		initialColorMode: 'dark',
		useSystemColorMode: false
	},
	shadows: {
		outline: 'none'
	}
});

export default theme;
