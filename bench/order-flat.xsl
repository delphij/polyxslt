<?xml version="1.0" encoding="UTF-8"?>
<!-- Benchmark stylesheet: sorts node-sets whose nodes hang under one long list of
     siblings, which is where comparing document positions is slowest.  The input is the
     one of the sitemap workload. -->
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:s="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:x="http://www.w3.org/1999/xhtml" version="1.0">
  <xsl:output method="xml"/>
  <xsl:template match="/">
    <order union="{count(//s:loc | //s:lastmod | //x:link/@href)}" urls="{count(//s:url[x:link] | //s:url[s:lastmod])}"
           parents="{count(//s:loc/..)}"/>
  </xsl:template>
</xsl:stylesheet>
