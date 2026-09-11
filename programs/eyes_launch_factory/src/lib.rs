use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, MintTo, Token, TokenAccount};

declare_id!("5RpsHikcarovDnb61ChFR36Ko3PYy8sxPS3aJiTQBpQF");

/// Default fair-launch supply — 1B tokens with 9 decimals (matches EVM stack).
pub const DEFAULT_TOKEN_SUPPLY: u64 = 1_000_000_000 * 1_000_000_000;
pub const TOKEN_DECIMALS: u8 = 9;

#[program]
pub mod eyes_launch_factory {
    use super::*;

    /// One-time factory bootstrap. Authority becomes program admin.
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let factory = &mut ctx.accounts.factory;
        factory.authority = ctx.accounts.authority.key();
        factory.launch_count = 0;
        factory.launches_enabled = true;
        factory.bump = ctx.bumps.factory;
        Ok(())
    }

    pub fn set_launches_enabled(ctx: Context<AdminOnly>, enabled: bool) -> Result<()> {
        ctx.accounts.factory.launches_enabled = enabled;
        Ok(())
    }

    /// Mint a new SPL fair-launch token and open the Eyes Window schedule.
    pub fn create_launch(
        ctx: Context<CreateLaunch>,
        name: String,
        symbol: String,
        window_seconds: u32,
    ) -> Result<()> {
        require!(window_seconds > 0, EyesError::InvalidWindow);
        require!(name.len() <= 32, EyesError::NameTooLong);
        require!(symbol.len() <= 10, EyesError::SymbolTooLong);
        require!(ctx.accounts.factory.launches_enabled, EyesError::LaunchesDisabled);

        let factory = &mut ctx.accounts.factory;
        factory.launch_count = factory
            .launch_count
            .checked_add(1)
            .ok_or(EyesError::LaunchOverflow)?;

        let launch_id = factory.launch_count;
        let now = Clock::get()?.unix_timestamp;
        let end = now
            .checked_add(i64::from(window_seconds))
            .ok_or(EyesError::InvalidWindow)?;

        let launch = &mut ctx.accounts.launch;
        launch.launch_id = launch_id;
        launch.creator = ctx.accounts.creator.key();
        launch.mint = ctx.accounts.mint.key();
        launch.name = name;
        launch.symbol = symbol;
        launch.eyes_window_start = now;
        launch.eyes_window_end = end;
        launch.phase = LaunchPhase::EyesWindow as u8;
        launch.liquidity_locked = false;
        launch.bump = ctx.bumps.launch;

        let seeds = &[
            b"factory".as_ref(),
            &[factory.bump],
        ];
        let signer = &[&seeds[..]];

        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.creator_token_account.to_account_info(),
                    authority: ctx.accounts.factory.to_account_info(),
                },
                signer,
            ),
            DEFAULT_TOKEN_SUPPLY,
        )?;

        emit!(LaunchCreated {
            launch_id,
            mint: ctx.accounts.mint.key(),
            creator: ctx.accounts.creator.key(),
            eyes_window_start: now,
            eyes_window_end: end,
        });

        Ok(())
    }

    /// Mark LP as locked after Raydium pool seed (called by creator once pool is live).
    pub fn finalize_liquidity(ctx: Context<FinalizeLiquidity>, pair: Pubkey) -> Result<()> {
        let launch = &mut ctx.accounts.launch;
        require!(!launch.liquidity_locked, EyesError::LiquidityAlreadyLocked);
        require_keys_eq!(launch.creator, ctx.accounts.creator.key(), EyesError::NotCreator);

        launch.pair = pair;
        launch.liquidity_locked = true;

        emit!(LiquidityLockCommitted {
            launch_id: launch.launch_id,
            mint: launch.mint,
            pair,
        });

        Ok(())
    }

    pub fn close_eyes_window_if_expired(ctx: Context<CloseWindow>) -> Result<()> {
        let launch = &mut ctx.accounts.launch;
        require!(
            launch.phase == LaunchPhase::EyesWindow as u8,
            EyesError::InvalidPhase
        );
        let now = Clock::get()?.unix_timestamp;
        require!(now > launch.eyes_window_end, EyesError::EyesWindowOpen);

        launch.phase = LaunchPhase::Trading as u8;
        emit!(EyesWindowClosed {
            launch_id: launch.launch_id,
            mint: launch.mint,
        });
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Factory::INIT_SPACE,
        seeds = [b"factory"],
        bump
    )]
    pub factory: Account<'info, Factory>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AdminOnly<'info> {
    #[account(
        mut,
        seeds = [b"factory"],
        bump = factory.bump,
        has_one = authority @ EyesError::Unauthorized
    )]
    pub factory: Account<'info, Factory>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct CreateLaunch<'info> {
    #[account(
        mut,
        seeds = [b"factory"],
        bump = factory.bump
    )]
    pub factory: Account<'info, Factory>,

    #[account(
        init,
        payer = creator,
        space = 8 + Launch::INIT_SPACE,
        seeds = [b"launch", factory.key().as_ref(), (factory.launch_count + 1).to_le_bytes().as_ref()],
        bump
    )]
    pub launch: Account<'info, Launch>,

    #[account(
        init,
        payer = creator,
        mint::decimals = TOKEN_DECIMALS,
        mint::authority = factory,
        mint::freeze_authority = factory,
    )]
    pub mint: Account<'info, Mint>,

    #[account(
        init,
        payer = creator,
        associated_token::mint = mint,
        associated_token::authority = creator,
    )]
    pub creator_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub creator: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct FinalizeLiquidity<'info> {
    #[account(
        mut,
        seeds = [b"launch", factory.key().as_ref(), launch.launch_id.to_le_bytes().as_ref()],
        bump = launch.bump,
        has_one = creator @ EyesError::NotCreator
    )]
    pub launch: Account<'info, Launch>,
    #[account(seeds = [b"factory"], bump = factory.bump)]
    pub factory: Account<'info, Factory>,
    pub creator: Signer<'info>,
}

#[derive(Accounts)]
pub struct CloseWindow<'info> {
    #[account(mut)]
    pub launch: Account<'info, Launch>,
}

#[account]
#[derive(InitSpace)]
pub struct Factory {
    pub authority: Pubkey,
    pub launch_count: u64,
    pub launches_enabled: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Launch {
    pub launch_id: u64,
    pub creator: Pubkey,
    pub mint: Pubkey,
    pub pair: Pubkey,
    #[max_len(32)]
    pub name: String,
    #[max_len(10)]
    pub symbol: String,
    pub eyes_window_start: i64,
    pub eyes_window_end: i64,
    pub phase: u8,
    pub liquidity_locked: bool,
    pub bump: u8,
}

#[repr(u8)]
pub enum LaunchPhase {
    Pending = 0,
    EyesWindow = 1,
    Trading = 2,
}

#[event]
pub struct LaunchCreated {
    pub launch_id: u64,
    pub mint: Pubkey,
    pub creator: Pubkey,
    pub eyes_window_start: i64,
    pub eyes_window_end: i64,
}

#[event]
pub struct LiquidityLockCommitted {
    pub launch_id: u64,
    pub mint: Pubkey,
    pub pair: Pubkey,
}

#[event]
pub struct EyesWindowClosed {
    pub launch_id: u64,
    pub mint: Pubkey,
}

#[error_code]
pub enum EyesError {
    #[msg("Eyes Window duration must be greater than zero")]
    InvalidWindow,
    #[msg("Token name too long")]
    NameTooLong,
    #[msg("Token symbol too long")]
    SymbolTooLong,
    #[msg("New launches are disabled")]
    LaunchesDisabled,
    #[msg("Launch counter overflow")]
    LaunchOverflow,
    #[msg("Liquidity already locked for this launch")]
    LiquidityAlreadyLocked,
    #[msg("Only the launch creator may perform this action")]
    NotCreator,
    #[msg("Launch is not in Eyes Window phase")]
    InvalidPhase,
    #[msg("Eyes Window has not ended yet")]
    EyesWindowOpen,
    #[msg("Unauthorized")]
    Unauthorized,
}
