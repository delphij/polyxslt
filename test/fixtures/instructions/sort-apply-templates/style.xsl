<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:n="urn:n" version="1.0">
  <xsl:output method="html"/>
  <xsl:template match="/">
    <html>
      <body>
        <xsl:apply-templates select="doc/item">
          <xsl:sort select="@id" data-type="number" order="descending"/>
        </xsl:apply-templates>
      </body>
    </html>
  </xsl:template>
  <xsl:template match="item">
    <p><xsl:value-of select="position()"/>:<xsl:value-of select="@id"/></p>
  </xsl:template>
</xsl:stylesheet>
