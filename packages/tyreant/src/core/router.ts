export interface TyrLocation {
  route: string;
  query?: any;
}

export interface TyrRouter {
  location?: TyrLocation;

  go({ route, query }: { route: any; query: any }): void;
}
