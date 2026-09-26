export interface PrivateCase {
  site: string;
  xml: string;
  xsl: string;
  expected: string;
}
export declare function privateCases(dir: string): PrivateCase[];
