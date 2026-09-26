<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:n="urn:n" version="1.0">
  <xsl:output method="html"/>
  <xsl:template match="/">
    <html>
      <body>
        <p><xsl:value-of select="doc/item/name"/>|<xsl:value-of select="1 div 3"/>|<xsl:value-of select="count(doc/item) > 2"/>|<xsl:value-of select="doc/missing"/>|<xsl:value-of select="sum(doc/item/@id)"/>|<xsl:value-of select="concat(doc/title, '!')"/></p>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
