export default class Table {
    private readonly widths: number[] = [];
    private readonly rows: any[] = [];
    private columns: string[] = [];

    public setColumns(columns: string[]) {
        this.columns = columns;
        for (const c of columns) this.widths.push(c.length + 2);

        return this;
    }

    public addRows(rows: any[]) {
        for (const row of rows) {
            const formattedRow = row.map((r: any) => String(r));
            this.rows.push(formattedRow);
            for (const [i, el] of formattedRow.entries()) {
                const width = el.length + 2;
                if (width > this.widths[i]) this.widths[i] = width;
            }
        }

        return this;
    }

    public render() {
        const table = [
            this.seperator('┌', '┐', '┬'),
            this.formatEntry(this.columns),
            this.seperator('├', '┤', '┼'),
            ...this.rows.map(row => this.formatEntry(row)),
            this.seperator('└', '┘', '┴')
        ];

        return table.join('\n');
    }

    private formatEntry(row: string[]) {
        return `│${row.map((el, i) => ` ${el}${' '.repeat(this.widths[i] - (el.length + 1))}`).join('│')}│`;
    }

    private seperator(rightChar: string, leftChar: string, middleChar: string) {
        return `${rightChar}${this.widths.map(w => '─'.repeat(w)).join(middleChar)}${leftChar}`;
    }
}