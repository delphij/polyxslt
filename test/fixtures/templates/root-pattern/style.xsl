<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:n="urn:n" version="1.0">
  <xsl:output method="html"/>
  <xsl:template match="/">
    <html>
      <body>
        <xsl:apply-templates select="doc"/>
      </body>
    </html>
  </xsl:template>
  <xsl:template match="/doc">
    <p>doc</p>
  </xsl:template>
  <xsl:template match="doc">
    <p>never</p>
  </xsl:template>
</xsl:stylesheet>
