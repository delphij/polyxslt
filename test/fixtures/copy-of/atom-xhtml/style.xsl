<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" exclude-result-prefixes="atom content">
  <xsl:output method="html"/>
  <xsl:template match="/">
    <html>
      <body>
        <xsl:for-each select="atom:feed/atom:entry"><article><xsl:copy-of select="atom:content/*"/></article></xsl:for-each>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
