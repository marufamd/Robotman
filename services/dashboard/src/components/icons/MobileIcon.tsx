import type { SVGProps } from 'react';

const MobileIcon = (props?: SVGProps<any>) => {
	return (
		<svg xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" width="44" height="44" viewBox="0 0 40 39.594" {...props}>
			<defs>
				<filter id="prefix__a" x={2.469} y={0.313} width={34.594} height={39.594} filterUnits="userSpaceOnUse">
					<feImage
						preserveAspectRatio="none"
						x={2.469}
						y={0.313}
						width={34.594}
						height={39.594}
						result="image"
						xlinkHref="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB3aWR0aD0iMzQuNTk0IiBoZWlnaHQ9IjM5LjU5NCIgdmlld0JveD0iMCAwIDM0LjU5NCAzOS41OTQiPgogIDxkZWZzPgogICAgPHN0eWxlPgogICAgICAuY2xzLTEgewogICAgICAgIGZpbGw6IHVybCgjbGluZWFyLWdyYWRpZW50KTsKICAgICAgfQogICAgPC9zdHlsZT4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0ibGluZWFyLWdyYWRpZW50IiB4MT0iNy4yMSIgeTE9IjM5LjU5NCIgeDI9IjI3LjM4NCIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPgogICAgICA8c3RvcCBvZmZzZXQ9Ii0wLjI1IiBzdG9wLWNvbG9yPSIjZmY1NDRmIi8+CiAgICAgIDxzdG9wIG9mZnNldD0iMC45NTkiIHN0b3AtY29sb3I9IiNmZmNlMDAiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxLjI1IiBzdG9wLWNvbG9yPSIjZmZjZTAwIiBzdG9wLW9wYWNpdHk9IjAuOTk2Ii8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogIDwvZGVmcz4KICA8cmVjdCBjbGFzcz0iY2xzLTEiIHdpZHRoPSIzNC41OTQiIGhlaWdodD0iMzkuNTk0Ii8+Cjwvc3ZnPgo="
					/>
					<feComposite result="composite" operator="in" in2="SourceGraphic" />
					<feBlend result="blend" in2="SourceGraphic" />
				</filter>
			</defs>
			<path
				d="M23.649 24.566a12.025 12.025 0 008.659-3.323 11.136 11.136 0 003.469-8.4q0-6.238-4.227-9.388T20.384.31H2.483V39.9H12.1V24.217L25.515 39.9H37.06v-.523L22.949 24.566h.7zM12.1 8.473h8.28A6.237 6.237 0 0124.378 9.7a4.141 4.141 0 011.545 3.44 4.188 4.188 0 01-1.574 3.469 6.163 6.163 0 01-3.965 1.254H12.1v-9.39z"
				transform="translate(.234 -.313)"
				fill="#ffbc3a"
				fillRule="evenodd"
				filter="url(#prefix__a)"
			/>
		</svg>
	);
};

export default MobileIcon;
