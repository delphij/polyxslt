<?xml version="1.0" encoding="UTF-8"?>
<!-- Benchmark stylesheet: node-sets that have to be put in document order.  "once" sorts
     large sets a few times, "repeated" sorts one for every section.  The input is the one
     of stress.xsl. -->
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
  <xsl:output method="xml"/>
  <xsl:template match="/">
    <order>
      <once union="{count(//name | //tag | //@price)}" nested="{count(//section//tag)}"
            parents="{count(//tag/..)}" mixed="{count(//*/name)}"/>
      <xsl:for-each select="catalog/section">
        <repeated n="{count(item/tag | //note | @name)}"/>
      </xsl:for-each>
    </order>
  </xsl:template>
</xsl:stylesheet>
