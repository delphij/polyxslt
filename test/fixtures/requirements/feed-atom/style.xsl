<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/" version="1.0" exclude-result-prefixes="atom content dc">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <xsl:variable name="atom-feed" select="boolean(/atom:feed)"/>
    <xsl:variable name="heading" select="atom:feed/atom:title | rss/channel/title"/>
    <xsl:variable name="declared">
      <xsl:choose>
        <xsl:when test="/atom:feed/@xml:lang">
          <xsl:value-of select="/atom:feed/@xml:lang"/>
        </xsl:when>
        <xsl:when test="rss/channel/language">
          <xsl:value-of select="rss/channel/language"/>
        </xsl:when>
        <xsl:otherwise>en</xsl:otherwise>
      </xsl:choose>
    </xsl:variable>
    <xsl:variable name="lang">
      <xsl:choose>
        <xsl:when test="contains($declared, 'zh-CN') or contains($declared, 'Hans')">zh-cn</xsl:when>
        <xsl:when test="contains($declared, 'ja')">ja</xsl:when>
        <xsl:otherwise>en</xsl:otherwise>
      </xsl:choose>
    </xsl:variable>
    <xsl:variable name="unit">
      <xsl:choose>
        <xsl:when test="$lang = 'zh-cn'">篇</xsl:when>
        <xsl:when test="$lang = 'ja'">件</xsl:when>
        <xsl:otherwise>items</xsl:otherwise>
      </xsl:choose>
    </xsl:variable>
    <html data-variant="a">
      <xsl:attribute name="lang">
        <xsl:value-of select="$lang"/>
      </xsl:attribute>
      <head>
        <meta charset="UTF-8"/>
        <title>
          <xsl:value-of select="$heading"/>
        </title>
        <link rel="stylesheet" href="/css/feed.css"/>
        <script><![CDATA[{const e=document.documentElement;e.dataset.variant="a"}]]></script>
      </head>
      <body>
        <header>
          <a href="https://example.org/{$lang}/">home</a>
          <h1>
            <xsl:value-of select="$heading"/>
          </h1>
          <p>
            <xsl:value-of select="count(atom:feed/atom:entry | rss/channel/item)"/>
            <xsl:text> </xsl:text>
            <xsl:value-of select="$unit"/>
          </p>
          <xsl:if test="$atom-feed and string-length(atom:feed/atom:updated) >= 4">
            <p class="year">
              <xsl:value-of select="substring(atom:feed/atom:updated, 1, 4)"/>
            </p>
          </xsl:if>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/>
            <path d="M4 4h16"/>
          </svg>
        </header>
        <main>
          <xsl:apply-templates select="atom:feed/atom:entry | rss/channel/item"/>
        </main>
      </body>
    </html>
  </xsl:template>
  <xsl:template match="atom:entry | item">
    <article>
      <h2>
        <a>
          <xsl:attribute name="href">
            <xsl:choose>
              <xsl:when test="atom:link/@href">
                <xsl:value-of select="atom:link/@href"/>
              </xsl:when>
              <xsl:otherwise>
                <xsl:value-of select="link"/>
              </xsl:otherwise>
            </xsl:choose>
          </xsl:attribute>
          <xsl:value-of select="atom:title | title" disable-output-escaping="yes"/>
        </a>
      </h2>
      <p class="date">
        <xsl:choose>
          <xsl:when test="string-length(atom:published) >= 16">
            <xsl:value-of select="substring(atom:published, 1, 10)"/>
            <xsl:text> </xsl:text>
            <xsl:value-of select="substring(atom:published, 12, 5)"/>
          </xsl:when>
          <xsl:when test="string-length(atom:updated) >= 16">
            <xsl:value-of select="substring(atom:updated, 1, 10)"/>
          </xsl:when>
          <xsl:when test="string-length(pubDate) >= 16">
            <xsl:value-of select="substring(pubDate, 1, 16)"/>
          </xsl:when>
        </xsl:choose>
      </p>
      <ul class="tags">
        <xsl:for-each select="atom:category/@term | category">
          <li>
            <xsl:value-of select="."/>
          </li>
        </xsl:for-each>
      </ul>
      <xsl:for-each select="(atom:category[not(@term='Release')] | category[not(.='Release')])[1]">
        <p class="lead-tag">
          <xsl:value-of select="@term | text()"/>
        </p>
      </xsl:for-each>
      <div class="content">
        <xsl:choose>
          <xsl:when test="atom:content">
            <xsl:value-of select="atom:content" disable-output-escaping="yes"/>
          </xsl:when>
          <xsl:when test="content:encoded">
            <xsl:value-of select="content:encoded" disable-output-escaping="yes"/>
          </xsl:when>
          <xsl:when test="atom:summary">
            <xsl:value-of select="atom:summary" disable-output-escaping="yes"/>
          </xsl:when>
          <xsl:otherwise>
            <xsl:value-of select="description" disable-output-escaping="yes"/>
          </xsl:otherwise>
        </xsl:choose>
      </div>
    </article>
  </xsl:template>
</xsl:stylesheet>
