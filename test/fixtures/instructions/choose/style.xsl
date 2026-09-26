<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:n="urn:n" version="1.0">
  <xsl:output method="html"/>
  <xsl:template match="/">
    <html>
      <body>
        <xsl:for-each select="doc/item">
          <p><xsl:choose><xsl:when test="@kind = 'x'">x</xsl:when><xsl:when test="@kind = 'b'">b</xsl:when><xsl:when test="@kind = 'b' or @id = 3">late</xsl:when><xsl:otherwise>other</xsl:otherwise></xsl:choose>|<xsl:choose><xsl:when test="@id = 1">one</xsl:when></xsl:choose></p>
        </xsl:for-each>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
