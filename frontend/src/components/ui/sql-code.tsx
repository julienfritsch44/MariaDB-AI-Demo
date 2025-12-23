import { cn } from "@/lib/utils"

interface SqlCodeProps {
    code: string
    className?: string
}

export function SqlCode({ code, className }: SqlCodeProps) {
    const renderSql = (sql: string) => {
        if (!sql) return null;
        return sql.split(/(\s+|[(),;])/).map((part, i) => {
            if (!part.trim()) return <span key={i}>{part}</span>;

            const word = part.trim().toUpperCase();
            const keywords = ['CREATE', 'INDEX', 'ON', 'USING', 'ALTER', 'TABLE', 'ADD', 'DROP', 'PRIMARY', 'KEY', 'UNIQUE', 'FOREIGN', 'REFERENCES', 'SELECT', 'UPDATE', 'DELETE', 'WHERE', 'FROM', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'AND', 'OR', 'ORDER', 'BY', 'GROUP', 'LIMIT', 'OFFSET', 'INSERT', 'INTO', 'VALUES', 'SET', 'DESC', 'ASC'];

            const isKeyword = keywords.includes(word);
            const isTableOrColumn = !isKeyword && /^[a-z_][a-z0-9_]*$/i.test(word);
            const isPunctuation = /[(),;]/.test(part);

            if (isKeyword) {
                return <span key={i} className="text-[#FF7B72]">{part}</span>; // Red/Pink
            } else if (isPunctuation) {
                return <span key={i} className="text-[#D2A8FF]">{part}</span>; // Purple
            } else if (isTableOrColumn) {
                return <span key={i} className="text-[#79C0FF]">{part}</span>; // Blue
            }
            return <span key={i} className="text-[#C9D1D9]">{part}</span>; // Standard
        })
    }

    return (
        <code className={cn("font-mono text-xs whitespace-pre-wrap leading-relaxed", className)}>
            {renderSql(code)}
        </code>
    )
}
