<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:n="urn:n" version="1.0">
  <xsl:output method="html"/>
  <xsl:template match="/">
    <html>
      <body>
        <xsl:apply-templates select="doc/item | doc/n:extra"/>
      </body>
    </html>
  </xsl:template>
  <xsl:template match="item">
    <p class="item">
      <xsl:value-of select="name"/>
    </p>
  </xsl:template>
  <xsl:template match="n:extra">
    <p class="extra">
      <xsl:value-of select="."/>
    </p>
  </xsl:template>
</xsl:stylesheet>
