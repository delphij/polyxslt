<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:n="urn:n" version="1.0">
  <xsl:output method="text"/>
  <xsl:template match="/">
    <xsl:for-each select="doc/item">
      <xsl:value-of select="name"/>
      <xsl:text>
</xsl:text>
    </xsl:for-each>
    <p>in element</p>
  </xsl:template>
</xsl:stylesheet>
