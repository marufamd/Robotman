import { Colors } from '#util/constants';
import { trim } from '#util/misc';
import type { MessageEmbedOptions } from 'discord.js';
import { MessageEmbed } from 'discord.js';

export class Embed extends MessageEmbed {
	public constructor(data?: MessageEmbed | MessageEmbedOptions) {
		if (typeof data !== 'object' || data === null) data = {};
		if (typeof data.color === 'undefined') data.color = Colors.ROBOTMAN;

		super(data);
	}

	public inlineFields(): this {
		const length = this.fields.length - 5;
		if (length % 3 === 0) this.addField('\u200b', '\u200b', true);
		return this;
	}
}

export class Table {
	private readonly widths: number[] = [];
	private readonly rows: any[] = [];
	private columns: string[] = [];

	public setColumns(columns: string[]): this {
		this.columns = columns;
		for (const c of columns) this.widths.push(c.length + 2);

		return this;
	}

	public addRows(rows: any[]): this {
		for (const row of rows) {
			const formattedRow = row.map((r: any) => {
				if (r instanceof Date) r = r.getTime();
				return trim(String(r), 30);
			});
			this.rows.push(formattedRow);
			for (const [i, el] of formattedRow.entries()) {
				const width = el.length + 2;
				if (width > this.widths[i]) this.widths[i] = width;
			}
		}

		return this;
	}

	public render(): string {
		const table = [
			this.separate('┌', '┬', '┐'),
			this.formatEntry(this.columns),
			this.separate('├', '┼', '┤'),
			...this.rows.map((row) => this.formatEntry(row)),
			this.separate('└', '┴', '┘')
		];

		return table.join('\n');
	}

	private formatEntry(row: string[]): string {
		return `│${row.map((el, i) => ` ${el}${' '.repeat(this.widths[i] - (el.length + 1))}`).join('│')}│`;
	}

	private separate(rightChar: string, middleChar: string, leftChar: string): string {
		return `${rightChar}${this.widths.map((w) => '─'.repeat(w)).join(middleChar)}${leftChar}`;
	}
}
