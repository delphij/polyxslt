<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:n="urn:n" version="1.0">
  <xsl:output method="html"/>
  <xsl:template match="/">
    <html>
      <body>
        <xsl:variable name="b" select="boolean(doc/item)"/>
        <xsl:variable name="s" select="string(doc/title)"/>
        <xsl:variable name="ns" select="doc/item"/>
        <xsl:variable name="want" select="'2'"/>
        <p><xsl:value-of select="$b"/>|<xsl:value-of select="$s"/>|<xsl:value-of select="count($ns)"/>|<xsl:value-of select="$ns[@id = $want]/name"/>|<xsl:value-of select="$ns[2]/name"/></p>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
