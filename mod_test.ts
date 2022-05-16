import { assert, assertEquals } from "https://deno.land/std@0.139.0/testing/asserts.ts";
import { createCompiler, toNumbered } from "./mod.ts";

Deno.test("compile", function() {
  const query = 'select users.json,EXISTS(select 1 from moderators where moderators.id = :id) as is_moderator from users where users.id = :id and users.status = :status and users.complete_status = :complete_status';
  const compile = createCompiler();
  const [ sql, args ] = compile(query, { id: 123, status: 'Yes!', complete_status: 'No!' });
  assert(sql, "select users.json,EXISTS(select 1 from moderators where moderators.id = ?) as is_moderator from users where users.id = ? and users.status = ? and users.complete_status = ?");
  assertEquals(args, [ 123, 123, 'Yes!', 'No!' ]);
});

Deno.test("toNumbered", function() {
  const query = 'select users.json,EXISTS(select 1 from moderators where moderators.id = :id) as is_moderator from users where users.id = :id and users.status = :status and users.complete_status = :complete_status';
  const [ sql, args ] = toNumbered(query, { id: 123, status: 'Yes!', complete_status: 'No!' });
  assert(sql, "select users.json,EXISTS(select 1 from moderators where moderators.id = $1) as is_moderator from users where users.id = $1 and users.status = $2 and users.complete_status = $3");
  assertEquals(args, [ 123, 'Yes!', 'No!' ]);
});
