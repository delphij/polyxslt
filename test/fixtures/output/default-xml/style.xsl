<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:n="urn:n" version="1.0">
  <xsl:template match="/">
    <result>
      <xsl:value-of select="doc/title"/>
      <n:e a="1"/>
    </result>
  </xsl:template>
</xsl:stylesheet>
