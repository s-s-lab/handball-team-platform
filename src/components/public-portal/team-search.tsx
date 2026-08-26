import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { PublicTeamSearchResult } from "@/features/public-portal/types";

type TeamSearchProps = {
  query: string;
  results: PublicTeamSearchResult[];
  submitted: boolean;
};

export function TeamSearch({ query, results, submitted }: TeamSearchProps) {
  return (
    <div className="flex flex-col gap-5">
      <form action="/" method="get">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="team-search" className="sr-only">
              チームを探す
            </FieldLabel>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                id="team-search"
                name="team_q"
                type="search"
                defaultValue={query}
                maxLength={100}
                autoComplete="off"
                placeholder="チーム名・略称で検索"
                className="sm:flex-1"
              />
              <Button type="submit" size="lg" className="sm:min-w-28">
                <Search data-icon="inline-start" aria-hidden="true" />
                検索
              </Button>
            </div>
          </Field>
        </FieldGroup>
      </form>

      {results.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          {results.map((team) => (
            <Link
              key={team.id}
              href={`/teams/${team.slug}`}
              className="group flex items-center gap-4 border-b border-border/70 px-4 py-4 transition-colors last:border-b-0 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <h3 className="font-bold text-foreground">{team.name}</h3>
                  {team.shortName ? (
                    <span className="text-xs font-semibold text-muted-foreground">{team.shortName}</span>
                  ) : null}
                </div>
                {team.description ? (
                  <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">
                    {team.description}
                  </p>
                ) : null}
              </div>
              <ChevronRight
                className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
          ))}
        </div>
      ) : submitted ? (
        <p className="rounded-2xl border border-border bg-card px-5 py-6 text-sm text-muted-foreground">
          該当する公開チームは見つかりませんでした。
        </p>
      ) : null}
    </div>
  );
}
