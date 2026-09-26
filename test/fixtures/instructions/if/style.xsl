<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:n="urn:n" version="1.0">
  <xsl:output method="html"/>
  <xsl:template match="/">
    <html>
      <body>
        <xsl:for-each select="doc/item">
          <p>
            <xsl:if test="@kind = 'a'">a</xsl:if>
            <xsl:if test="price >= 5">expensive</xsl:if>
            <xsl:if test="string-length(date) >= 16">
              <xsl:value-of select="substring(date, 12, 5)"/>
            </xsl:if>
          </p>
        </xsl:for-each>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
