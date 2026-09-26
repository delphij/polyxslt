<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:n="urn:n" version="1.0">
  <xsl:output method="html"/>
  <xsl:template match="/">
    <html>
      <body>
        <xsl:apply-templates select="doc/node()"/>
      </body>
    </html>
  </xsl:template>
  <xsl:template match="node()">
    <i>node</i>
  </xsl:template>
  <xsl:template match="*">
    <i>star</i>
  </xsl:template>
  <xsl:template match="n:*">
    <i>ns-star</i>
  </xsl:template>
  <xsl:template match="item">
    <i>item</i>
  </xsl:template>
  <xsl:template match="text()">
    <i>text</i>
  </xsl:template>
  <xsl:template match="doc/item[@kind='b']">
    <i>item-b</i>
  </xsl:template>
</xsl:stylesheet>
