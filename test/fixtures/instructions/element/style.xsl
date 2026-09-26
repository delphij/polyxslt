<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:n="urn:n" version="1.0">
  <xsl:output method="html"/>
  <xsl:template match="/">
    <html>
      <head>
        <xsl:element name="title">
          <xsl:text>Site — </xsl:text>
          <xsl:value-of select="doc/title"/>
        </xsl:element>
      </head>
      <body>
        <xsl:element name="{concat('h', count(doc/item) - 1)}">h</xsl:element>
        <xsl:element name="section"><xsl:attribute name="id">s</xsl:attribute>c</xsl:element>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
