<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:n="urn:n" version="1.0">
  <xsl:output method="html"/>
  <xsl:template match="/">
    <html>
      <body>
        <xsl:variable name="declared">
          <xsl:choose>
            <xsl:when test="doc/@lang">
              <xsl:value-of select="doc/@lang"/>
            </xsl:when>
            <xsl:otherwise>en</xsl:otherwise>
          </xsl:choose>
        </xsl:variable>
        <xsl:variable name="label">
          <xsl:choose>
            <xsl:when test="$declared = 'en'">English</xsl:when>
            <xsl:otherwise>Other</xsl:otherwise>
          </xsl:choose>
        </xsl:variable>
        <xsl:variable name="empty"/>
        <p title="{$label}"><xsl:value-of select="$label"/>|<xsl:value-of select="contains($declared, 'e')"/>|<xsl:value-of select="count($label)"/>|<xsl:value-of select="boolean($empty)"/>|<xsl:value-of select="string-length($label)"/></p>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
