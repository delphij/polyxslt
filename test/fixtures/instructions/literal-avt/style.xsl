<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:n="urn:n" version="1.0">
  <xsl:output method="html"/>
  <xsl:variable name="base">https://example.org</xsl:variable>
  <xsl:template match="/">
    <html>
      <body>
        <xsl:for-each select="doc/item">
          <a href="{$base}/items/{@id}/" title="{name} ({@kind})" data-x="{{literal}} {{{@id}}}">x</a>
        </xsl:for-each>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
