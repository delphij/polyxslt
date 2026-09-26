<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:n="urn:n" version="1.0">
  <xsl:output method="html"/>
  <xsl:variable name="base">https://example.org</xsl:variable>
  <xsl:variable name="count" select="count(doc/item)"/>
  <xsl:template match="/">
    <html>
      <body>
        <a href="{$base}/list">x</a>
        <p><xsl:value-of select="$base"/>|<xsl:value-of select="$count"/>|<xsl:value-of select="$base = 'https://example.org'"/></p>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
