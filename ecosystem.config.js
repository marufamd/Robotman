module.exports = {
	apps: [
		{
			name: 'bot',
			cwd: './services/bot',
			script: 'npm',
			args: 'run start'
		},
		{
			name: 'api',
			cwd: './services/api',
			script: 'npm',
			args: 'run start'
		},
		{
			name: 'dashboard',
			cwd: './services/dashboard',
			script: 'npm',
			args: 'run start'
		}
	]
};
