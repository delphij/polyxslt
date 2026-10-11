<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:n="urn:n" version="1.0">
  <xsl:variable name="tree"><html><body>rtf</body></html></xsl:variable>
  <xsl:template match="/">
    <n:html><html><body><A HREF="/a b">link</A></body></html><xsl:value-of select="$tree"/></n:html>
  </xsl:template>
</xsl:stylesheet>
