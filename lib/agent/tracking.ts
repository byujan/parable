/**
 * Rewrite links and inject tracking pixel into AI-generated email HTML.
 *
 * - All <a href="..."> links are rewritten to go through /api/track/click
 * - A 1x1 tracking pixel is appended for open detection
 */
export function injectTracking(
  html: string,
  appUrl: string,
  token: string,
): string {
  // Rewrite all href links to go through the click tracker
  const rewritten = html.replace(
    /href=["']([^"']+)["']/gi,
    (_match, url: string) => {
      // Skip mailto: and tel: links
      if (url.startsWith('mailto:') || url.startsWith('tel:')) {
        return `href="${url}"`
      }
      const trackUrl = `${appUrl}/api/track/click?token=${encodeURIComponent(token)}&url=${encodeURIComponent(url)}`
      return `href="${trackUrl}"`
    },
  )

  // Inject open-tracking pixel before </body> or at the end
  const pixel = `<img src="${appUrl}/api/track/open?token=${encodeURIComponent(token)}" width="1" height="1" style="display:none" alt="" />`

  if (rewritten.includes('</body>')) {
    return rewritten.replace('</body>', `${pixel}</body>`)
  }

  return rewritten + pixel
}
