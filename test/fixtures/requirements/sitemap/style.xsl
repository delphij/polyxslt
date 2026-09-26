<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" version="1.0" exclude-result-prefixes="sitemap xhtml">
  <xsl:output method="html" encoding="UTF-8" indent="yes" doctype-system="about:legacy-compat"/>
  <xsl:variable name="origin">https://example.org</xsl:variable>
  <xsl:template match="/">
    <html lang="en">
      <head>
        <meta charset="utf-8"/>
        <xsl:element name="title">
          <xsl:text>Sitemap — </xsl:text>
          <xsl:value-of select="count(sitemap:urlset/sitemap:url)"/>
        </xsl:element>
        <script src="/js/i18n.js"/>
        <script><![CDATA[var I18N = {"a":1};]]></script>
      </head>
      <body>
        <p>posts: <xsl:value-of select="count(sitemap:urlset/sitemap:url[contains(sitemap:loc, '/posts/')])"/>, other: <xsl:value-of select="count(sitemap:urlset/sitemap:url[not(contains(sitemap:loc, '/posts/')) and not(contains(sitemap:loc, '/tags/')) and not(contains(sitemap:loc, '/categories/'))])"/></p>
        <table>
          <xsl:for-each select="sitemap:urlset/sitemap:url">
            <xsl:sort select="sitemap:lastmod" order="descending"/>
            <xsl:variable name="url" select="sitemap:loc"/>
            <xsl:variable name="n" select="position()"/>
            <xsl:variable name="alt-lang" select="xhtml:link[@href = $url]/@hreflang"/>
            <xsl:variable name="section">
              <xsl:choose>
                <xsl:when test="contains($url, '/posts/')">post</xsl:when>
                <xsl:when test="contains($url, '/tags/')">tag</xsl:when>
                <xsl:otherwise>page</xsl:otherwise>
              </xsl:choose>
            </xsl:variable>
            <xsl:variable name="rel-path">
              <xsl:choose>
                <xsl:when test="contains(substring-after($url, '://'), '/')">
                  <xsl:value-of select="substring-after(substring-after($url, '://'), '/')"/>
                </xsl:when>
              </xsl:choose>
            </xsl:variable>
            <tr data-type="{$section}" data-path="{$rel-path}" data-time="{sitemap:lastmod}">
              <xsl:if test="$alt-lang">
                <xsl:attribute name="lang">
                  <xsl:value-of select="$alt-lang"/>
                </xsl:attribute>
              </xsl:if>
              <td>
                <xsl:value-of select="$n"/>
              </td>
              <td>
                <a href="{$url}">
                  <xsl:choose>
                    <xsl:when test="starts-with($url, $origin)">
                      <xsl:value-of select="substring-after($url, $origin)"/>
                    </xsl:when>
                    <xsl:otherwise>
                      <xsl:value-of select="$url"/>
                    </xsl:otherwise>
                  </xsl:choose>
                </a>
              </td>
              <td>
                <xsl:if test="string-length(sitemap:lastmod) >= 16">
                  <xsl:value-of select="substring(sitemap:lastmod, 1, 10)"/>
                  <xsl:text> </xsl:text>
                  <xsl:value-of select="substring(sitemap:lastmod, 12, 5)"/>
                </xsl:if>
              </td>
            </tr>
          </xsl:for-each>
        </table>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
