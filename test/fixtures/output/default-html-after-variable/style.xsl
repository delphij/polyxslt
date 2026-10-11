<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:n="urn:n" version="1.0">
  <xsl:template match="/">
    <xsl:variable name="tree"><n:a><P Class="x">rtf</P></n:a><Q>q</Q></xsl:variable>
    <html><body><xsl:copy-of select="$tree"/><p><xsl:value-of select="$tree"/></p></body></html>
  </xsl:template>
</xsl:stylesheet>
