/**
 * Unit tests for RegexFallback
 */

import { expect } from 'chai';
import { RegexFallback } from '../../../../src/outline/regexFallback';
import * as vscode from 'vscode';

describe('RegexFallback', () => {
  let fallback: RegexFallback;

  before(() => {
    fallback = new RegexFallback();
  });

  describe('extract - TypeScript', () => {
    it('should extract types from TypeScript', async () => {
      const code = `
        export interface IUser {
          name: string;
          age: number;
        }

        export type Status = 'active' | 'inactive';

        export class UserService {
          private users: IUser[] = [];
        }
      `;

      const mockDoc = createMockDocument(code, 'typescript');
      const result = await fallback.extract(mockDoc);

      expect(result).to.include('TYPES');
      expect(result).to.include('interface IUser');
      expect(result).to.include('type Status');
      expect(result).to.include('class UserService');
    });

    it('should extract functions from TypeScript', async () => {
      const code = `
        async function getUser(id: string): Promise<IUser> {
          return {} as IUser;
        }

        const processData = (data: string) => {
          return data.toUpperCase();
        };

        export class Controller {
          public handleRequest(): void {
            console.log('handled');
          }
        }
      `;

      const mockDoc = createMockDocument(code, 'typescript');
      const result = await fallback.extract(mockDoc);

      expect(result).to.include('FUNCTIONS');
      expect(result).to.include('function getUser');
    });

    it('should extract imports from TypeScript', async () => {
      const code = `
        import { useState } from 'react';
        import type { User } from './types';
        const fs = require('fs');
      `;

      const mockDoc = createMockDocument(code, 'typescript');
      const result = await fallback.extract(mockDoc);

      expect(result).to.include('IMPORTS');
      expect(result).to.include('import');
    });
  });

  describe('extract - Python', () => {
    it('should extract classes and functions from Python', async () => {
      const code = `
        class UserService:
            def __init__(self):
                self.users = []

            def get_user(self, user_id: str) -> dict:
                return {"id": user_id}

        async def process_data(data: str) -> str:
            return data.upper()
      `;

      const mockDoc = createMockDocument(code, 'python');
      const result = await fallback.extract(mockDoc);

      expect(result).to.include('TYPES');
      expect(result).to.include('class UserService');
      expect(result).to.include('FUNCTIONS');
    });

    it('should extract imports from Python', async () => {
      const code = `
        import os
        import sys
        from typing import List, Dict
        from .models import User
      `;

      const mockDoc = createMockDocument(code, 'python');
      const result = await fallback.extract(mockDoc);

      expect(result).to.include('IMPORTS');
      expect(result).to.include('import os');
    });
  });

  describe('extract - Go', () => {
    it('should extract structs and functions from Go', async () => {
      const code = `
        package main

        type User struct {
            Name string
            Age  int
        }

        type Service interface {
            GetUser(id string) (*User, error)
        }

        func GetUser(id string) (*User, error) {
            return &User{Name: "Test"}, nil
        }
      `;

      const mockDoc = createMockDocument(code, 'go');
      const result = await fallback.extract(mockDoc);

      expect(result).to.include('TYPES');
      expect(result).to.include('type User struct');
      expect(result).to.include('type Service interface');
      expect(result).to.include('FUNCTIONS');
      expect(result).to.include('func GetUser');
    });
  });

  describe('extract - Rust', () => {
    it('should extract structs and functions from Rust', async () => {
      const code = `
        pub struct User {
            pub name: String,
            pub age: u32,
        }

        pub trait UserService {
            fn get_user(&self, id: &str) -> Option<&User>;
        }

        pub async fn process_user(id: &str) -> Result<User, Error> {
            Ok(User { name: String::from("Test"), age: 0 })
        }
      `;

      const mockDoc = createMockDocument(code, 'rust');
      const result = await fallback.extract(mockDoc);

      expect(result).to.include('TYPES');
      expect(result).to.include('struct User');
      expect(result).to.include('trait UserService');
      expect(result).to.include('FUNCTIONS');
      expect(result).to.include('fn process_user');
    });
  });

  describe('extract - Java', () => {
    it('should extract classes and methods from Java', async () => {
      const code = `
        public class UserService {
            private List<User> users;

            public User getUser(String id) {
                return new User();
            }

            private void validateUser(User user) {
                // validation
            }
        }

        interface IUserRepository {
            User findById(String id);
        }
      `;

      const mockDoc = createMockDocument(code, 'java');
      const result = await fallback.extract(mockDoc);

      expect(result).to.include('TYPES');
      expect(result).to.include('class UserService');
      expect(result).to.include('interface IUserRepository');
      expect(result).to.include('FUNCTIONS');
    });
  });

  describe('extract - C++', () => {
    it('should extract structs and functions from C++', async () => {
      const code = `
        #include <iostream>
        #include <vector>

        struct User {
            std::string name;
            int age;
        };

        class UserService {
        public:
            User getUser(const std::string& id) {
                return User{};
            }
        };
      `;

      const mockDoc = createMockDocument(code, 'cpp');
      const result = await fallback.extract(mockDoc);

      expect(result).to.include('TYPES');
      expect(result).to.include('struct User');
      expect(result).to.include('class UserService');
      expect(result).to.include('IMPORTS');
      expect(result).to.include('#include');
    });
  });

  describe('extract - Edge Cases', () => {
    it('should handle empty document', async () => {
      const mockDoc = createMockDocument('', 'typescript');
      const result = await fallback.extract(mockDoc);

      expect(result).to.be.a('string');
    });

    it('should handle document with only comments', async () => {
      const code = `
        // This is a comment
        /**
         * Multi-line comment
         */
        # Another comment style
      `;

      const mockDoc = createMockDocument(code, 'typescript');
      const result = await fallback.extract(mockDoc);

      expect(result).to.be.a('string');
    });

    it('should truncate long lines', async () => {
      const longSignature = 'a'.repeat(200);
      const code = `
        function ${longSignature}() {
          return true;
        }
      `;

      const mockDoc = createMockDocument(code, 'typescript');
      const result = await fallback.extract(mockDoc);

      // Should truncate long lines
      expect(result).to.not.include(longSignature);
    });

    it('should limit output counts', async () => {
      const types = Array.from({ length: 30 }, (_, i) => `export interface Type${i} {}`);
      const functions = Array.from({ length: 50 }, (_, i) => `export function func${i}() {}`);
      const imports = Array.from({ length: 20 }, (_, i) => `import { x${i} } from 'file${i}';`);

      const code = [...types, ...functions, ...imports].join('\n');
      const mockDoc = createMockDocument(code, 'typescript');
      const result = await fallback.extract(mockDoc);

      // Should show "more" indicators
      expect(result).to.include('more');
    });

    it('should handle unsupported language with fallback patterns', async () => {
      const code = `
        class UnknownClass {
          function unknownMethod() {}
        }
      `;

      const mockDoc = createMockDocument(code, 'unknown-language');
      const result = await fallback.extract(mockDoc);

      expect(result).to.be.a('string');
      // Should use fallback patterns
      expect(result).to.include('class UnknownClass') ||
        expect(result.length).to.be.greaterThan(0);
    });
  });
});

function createMockDocument(content: string, languageId: string): vscode.TextDocument {
  return {
    uri: vscode.Uri.parse(`file:///test.${languageId}`),
    languageId,
    getText: () => content,
    lineAt: () => ({ text: '' }),
  } as unknown as vscode.TextDocument;
}
