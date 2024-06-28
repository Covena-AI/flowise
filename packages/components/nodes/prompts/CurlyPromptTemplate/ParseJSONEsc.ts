export const parseJSONEscapeTags = (input: string): string => {
    // Regular expression to match non-escaped <JSONEsc> tags and their contents
    const regex = /<JSONEsc>([\s\S]*?)<\/JSONEsc>/g

    // Function to replace matched content
    const replacer = (match: string, p1: string): string => {
        // URL-encode the captured content
        const encodedContent = encodeURIComponent(p1.trim())
        return encodedContent
    }

    // Replace non-escaped <JSONEsc> tags and their contents
    let result = input.replace(regex, replacer)

    // Handle escaped tags by removing the backslash
    result = result.replace(/\\<JSONEsc>/g, '<JSONEsc>')
    result = result.replace(/\\<\/JSONEsc>/g, '</JSONEsc>')

    return result
}
