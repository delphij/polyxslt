<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:n="urn:n" version="1.0">
  <xsl:output method="html"/>
  <xsl:template match="/">
    <html>
      <body>
        <xsl:apply-templates select="doc/item"/>
      </body>
    </html>
  </xsl:template>
  <xsl:template match="item">
    <i>first</i>
  </xsl:template>
  <xsl:template match="item">
    <i>second</i>
  </xsl:template>
</xsl:stylesheet>
