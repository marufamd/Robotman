import '#styles/globals.css';
import { ChakraProvider } from '@chakra-ui/react';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import theme from '#utils/theme';
import { QueryClient, QueryClientProvider } from 'react-query';
import { DiscordUserProvider } from '#hooks/discord';

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: Infinity
		}
	}
});

const App = ({ Component, pageProps }: AppProps) => {
	return (
		<>
			<Head>
				<title>Robotman</title>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1.0, minimum-sacle=1.0" />
				<link rel="icon" type="image/png" sizes="96x96" href="/favicon.png" />

				<meta name="theme-color" content="#f2b139" />
				<meta name="og:site_name" content="Robotman" />
				<meta property="og:title" content="Robotman Dashboard" />
				<meta property="og:description" content="Dashboard interface for Robotman" />
				<meta property="og:type" content="website" />
			</Head>
			<DiscordUserProvider>
				<QueryClientProvider client={queryClient}>
					<ChakraProvider theme={theme}>
						<Component {...pageProps} />
					</ChakraProvider>
				</QueryClientProvider>
			</DiscordUserProvider>
		</>
	);
};

export default App;
